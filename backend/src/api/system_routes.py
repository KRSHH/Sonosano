import json
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from models.library_models import ShowInExplorerRequest
from models.system_models import RomanizeRequest, ConfigRequest
from core.soulseek_manager import SoulseekManager
from core.romanization_service import RomanizationService
from pynicotine.config import config
from pynicotine.events import events
import os
import subprocess
import sys
import glob

router = APIRouter()

soulseek_manager: SoulseekManager
romanization_service: RomanizationService
data_path: str

@router.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Sonosano API is running"}

@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "soulseek_connected": soulseek_manager.logged_in}

@router.get("/download-dir")
async def get_download_dir():
    """Get the download directory path."""
    try:
        download_dir = config.sections["transfers"]["downloaddir"]
        return {"download_dir": download_dir}
    except KeyError:
        raise HTTPException(status_code=404, detail="Download directory not configured")

@router.get("/play-file/{file_name}")
async def play_file(file_name: str):
    """Stream an audio file for playback."""
    download_dir = config.sections["transfers"]["downloaddir"]
    file_path = os.path.join(download_dir, file_name)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    ext = os.path.splitext(file_name)[1].lower()
    mime_types = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.flac': 'audio/flac',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.ogg': 'audio/ogg',
        '.opus': 'audio/opus',
        '.wma': 'audio/x-ms-wma'
    }
    
    media_type = mime_types.get(ext, 'audio/mpeg')
    
    return FileResponse(
        path=file_path,
        media_type=media_type,
        headers={
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-cache'
        }
    )

@router.post("/show-in-explorer")
async def show_in_explorer(request: ShowInExplorerRequest):
    """Show a file in the default file explorer."""
    download_dir = config.sections["transfers"]["downloaddir"]
    file_path = os.path.join(download_dir, request.filePath)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File not found at: {file_path}")
    
    try:
        if sys.platform == "win32":
            subprocess.run(["explorer", "/select,", os.path.normpath(file_path)], check=True)
        elif sys.platform == "darwin":
            subprocess.run(["open", "-R", os.path.normpath(file_path)], check=True)
        else:
            subprocess.run(["xdg-open", os.path.dirname(os.path.normpath(file_path))], check=True)
        
        return {"message": "File shown in explorer", "file_path": file_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred while opening the file explorer: {e}")

@router.get("/sharing/status")
async def get_sharing_status():
    """Get current sharing status and statistics."""
    try:
        download_dir = config.sections["transfers"]["downloaddir"]
        shared_folders = config.sections["transfers"]["shared"]
        
        file_count = 0
        total_size = 0
        
        if os.path.exists(download_dir):
            for ext in {'.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma', '.opus'}:
                pattern = os.path.join(download_dir, f"*{ext}")
                for file_path in glob.glob(pattern):
                    if os.path.isfile(file_path):
                        file_count += 1
                        total_size += os.path.getsize(file_path)
        
        is_sharing_downloads = any(
            folder_path == download_dir for _, folder_path in shared_folders
        )
        
        return {
            "sharing_enabled": len(shared_folders) > 0,
            "sharing_downloads": is_sharing_downloads,
            "shared_folders": shared_folders,
            "download_dir": download_dir,
            "shared_files_count": file_count,
            "total_shared_size": total_size,
            "upload_slots": config.sections["transfers"]["uploadslots"],
            "rescan_on_startup": config.sections["transfers"]["rescanonstartup"],
            "rescan_daily": config.sections["transfers"]["rescan_shares_daily"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get sharing status")

@router.post("/sharing/rescan")
async def rescan_shares():
    """Manually trigger a rescan of shared folders."""
    try:
        if hasattr(core, 'shares') and core.shares:
            events.emit_main_thread("shares-scanning")
            core.shares.rescan_shares()
            return {"message": "Share rescan initiated"}
        else:
            return {"message": "Shares system not available"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to rescan shares")

@router.get("/connection/status")
async def get_connection_status():
    """Get detailed connection status and diagnostics."""
    try:
        status = {
            "logged_in": soulseek_manager.logged_in,
            "username": config.sections["server"]["login"] if soulseek_manager.logged_in else None,
            "server_address": config.sections["server"]["server"],
            "port_range": config.sections["server"]["portrange"],
            "upnp_enabled": config.sections["server"]["upnp"],
            "interface": config.sections["server"]["interface"]
        }
        
        if hasattr(core, 'users') and core.users:
            status["our_ip"] = getattr(core.users, 'local_ip', 'Unknown')
            status["listening_port"] = getattr(core.users, 'listening_port', 'Unknown')
        
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get connection status")

@router.post("/romanize")
async def romanize_text(request: RomanizeRequest):
    """Romanize text using uroman."""
    try:
        romanized_text = romanization_service.romanize(request.text)
        return {"romanized_text": romanized_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cover/{image_path:path}")
async def get_cover_image(image_path: str):
    """Serve a cover image from the local covers directory."""
    covers_dir = os.path.join(data_path, "covers")
    file_path = os.path.join(covers_dir, image_path)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Cover image not found at {file_path}")
    
    return FileResponse(file_path)

from configparser import ConfigParser
from core.config_utils import get_config_path

@router.get("/config")
async def get_config():
    """Get the application configuration."""
    config_path = get_config_path()
    if not os.path.exists(config_path):
        raise HTTPException(status_code=404, detail="Config file not found")
    
    config = ConfigParser()
    config.read(config_path)
    
    data_path = config.get('Paths', 'dataPath', fallback=None)
    if data_path is None:
        raise HTTPException(status_code=404, detail="dataPath not found in config")
        
    return {"dataPath": data_path}

@router.post("/config")
async def save_config(request: ConfigRequest):
    """Save the application configuration."""
    logging.info(f"Received request to save config: {request}")
    try:
        config_path = get_config_path()
        
        config = ConfigParser()
        config['Paths'] = {'dataPath': request.dataPath}
        
        with open(config_path, 'w') as f:
            config.write(f)
            
        logging.info(f"Successfully saved config to {config_path}")
        return {"message": "Configuration saved. Please restart the application for the changes to take effect."}
    except Exception as e:
        logging.error(f"Error saving config: {e}")
        raise HTTPException(status_code=500, detail=str(e))