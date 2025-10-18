import logging
from fastapi import APIRouter, HTTPException
from models.download_models import DownloadRequest, DownloadStatus, DownloadsAndStatusResponse, AlbumDownloadRequest
from models.system_models import SystemStatus
from core.soulseek_manager import SoulseekManager
from core.playlist_service import PlaylistService
from core.library_service import LibraryService
from models.playlist_models import Playlist
import uuid
from datetime import datetime
from pynicotine.core import core
from pynicotine.config import config
import os
import time

router = APIRouter()

soulseek_manager: SoulseekManager
playlist_service: PlaylistService
library_service: LibraryService

def _generate_download_id(username: str, file_path: str) -> str:
    """Generates a consistent download ID."""
    return f"{username}:{file_path}"

@router.post("/download")
async def download_file(download_request: DownloadRequest):
    """Download a file from a user."""
    if not soulseek_manager.logged_in:
        raise HTTPException(status_code=503, detail="Not connected to Soulseek")
    
    download_id = _generate_download_id(download_request.username, download_request.file_path)
    filename = os.path.basename(download_request.file_path)
    
    if download_request.metadata:
        soulseek_manager.library_service.download_metadata[download_id] = download_request.metadata
        soulseek_manager.library_service.download_metadata[filename] = download_request.metadata
    
    soulseek_manager.active_downloads[download_id] = {
        'id': download_id,
        'file_name': filename,
        'file_path': download_request.file_path,
        'username': download_request.username,
        'size': download_request.size,
        'metadata': download_request.metadata,
        'timestamp': time.time()
    }
    
    core.downloads.enqueue_download(
        username=download_request.username,
        virtual_path=download_request.file_path,
        size=download_request.size
    )
    
    return {"message": "Download started", "download_id": download_id}

@router.post("/download-album")
async def download_album(request: AlbumDownloadRequest):
    """Downloads an entire album/folder into an organized subdirectory."""
    if not soulseek_manager.logged_in:
        raise HTTPException(status_code=503, detail="Not connected to Soulseek")

    # Sanitize artist and album names to create a valid path
    sanitized_artist = "".join(c for c in request.artist if c.isalnum() or c in (' ', '_')).rstrip()
    sanitized_album = "".join(c for c in request.album if c.isalnum() or c in (' ', '_')).rstrip()
    
    if not sanitized_artist or not sanitized_album:
        raise HTTPException(status_code=400, detail="Invalid artist or album name for directory creation.")

    download_dir = config.sections["transfers"]["downloaddir"]
    album_path = os.path.join(download_dir, sanitized_artist, sanitized_album)
    
    try:
        os.makedirs(album_path, exist_ok=True)
    except OSError as e:
        logging.error(f"Failed to create directory {album_path}: {e}")
        raise HTTPException(status_code=500, detail=f"Could not create album directory: {e}")

    for file in request.files:
        # We need to tell Soulseek to save the file in the new subdirectory
        # Pynicotine's enqueue_download doesn't directly support subdirectories,
        # so we rely on the fact that we've created it and the file watcher will pick it up.
        # The filename in the download queue will be the final part of the path.
        filename = os.path.basename(file.path)
        destination_path = os.path.join(album_path, filename)

        core.downloads.enqueue_download(
            username=request.username,
            virtual_path=file.path,
            size=file.size,
            local_path=destination_path # This tells pynicotine where to save it
        )
        
        # Store metadata for the song processor
        download_id = _generate_download_id(request.username, file.path)
        soulseek_manager.library_service.download_metadata[download_id] = request.metadata
    
    # Now, create a playlist for the album
    playlist_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    thumbnail_url = request.metadata.get('coverArtUrl') if request.metadata else None
    thumbnail_filename = playlist_service.download_playlist_thumbnail(sanitized_album, thumbnail_url)

    # Construct the relative paths for the playlist
    song_paths = [
        os.path.join(sanitized_artist, sanitized_album, os.path.basename(file.path)).replace('\\', '/')
        for file in request.files
    ]

    new_playlist = Playlist(
        id=playlist_id,
        name=sanitized_album,
        description=f"Album by {sanitized_artist}",
        thumbnail=thumbnail_filename,
        songs=song_paths,
        createdAt=now,
        updatedAt=now
    )
    
    library_service.create_playlist(new_playlist)

    return {"message": f"Album '{request.album}' download started and playlist created."}

@router.get("/download-status/{username}/{file_path:path}")
async def get_download_status(username: str, file_path: str):
    """Get the status of a download."""
    key = _generate_download_id(username, file_path)
    status = soulseek_manager.download_status.get(key, {
        'status': 'Not started',
        'progress': 0,
        'total': 0, 
        'percent': 0,
        'speed': 0,
        'queuePosition': None
    })
    
    return DownloadStatus(
        status=status['status'],
        progress=status['progress'],
        total=status['total'],
        percent=status['percent'],
        speed=status.get('speed', 0),
        queuePosition=status.get('queuePosition'),
        errorMessage=status.get('errorMessage')
    )

@router.get("/downloads/status", response_model=DownloadsAndStatusResponse)
async def get_all_downloads_status():
    """Get the status of all downloads and the system."""
    downloads_list = []
    
    for download_id, download_info in soulseek_manager.active_downloads.items():
        status_info = soulseek_manager.download_status.get(download_id, {
            'status': 'Queued',
            'progress': 0,
            'total': download_info['size'],
            'percent': 0,
            'speed': 0,
            'queuePosition': None
        })
        
        download_data = {
            'id': download_id,
            'file_name': download_info['file_name'],
            'file_path': download_info['file_path'],
            'path': download_info['file_path'],
            'username': download_info['username'],
            'size': download_info['size'],
            'metadata': download_info.get('metadata'),
            'timestamp': download_info['timestamp'],
            'status': status_info['status'],
            'progress': status_info['progress'],
            'total': status_info['total'],
            'percent': status_info['percent'],
            'speed': status_info.get('speed', 0),
            'queue_position': status_info.get('queuePosition'),
            'error_message': status_info.get('errorMessage'),
            'time_remaining': soulseek_manager.calculate_time_remaining(
                status_info['progress'],
                status_info['total'],
                status_info.get('speed', 0)
            ) if status_info.get('speed', 0) > 0 else None
        }
        
        downloads_list.append(download_data)
    
    downloads_list.sort(key=lambda x: x['timestamp'], reverse=True)

    soulseek_status = "Connected" if soulseek_manager.logged_in else "Disconnected"
    
    system_status = SystemStatus(
        backend_status="Online",
        soulseek_status=soulseek_status,
        soulseek_username=config.sections["server"]["login"] if soulseek_manager.logged_in else None,
        active_uploads=len([t for t in core.uploads.transfers.values() if t.status == 'Transferring']),
        active_downloads=len([t for t in core.downloads.transfers.values() if t.status == 'Transferring'])
    )
    
    return DownloadsAndStatusResponse(
        downloads=downloads_list,
        system_status=system_status
    )

@router.post("/download/cancel/{download_id:path}")
async def cancel_download(download_id: str):
    """Cancel an active download."""
    from urllib.parse import unquote
    download_id = unquote(download_id)
    
    try:
        parts = download_id.split(':', 1)
        username = parts[0]
        file_path = parts[1]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid download ID format")
    
    if download_id in soulseek_manager.active_downloads:
        del soulseek_manager.active_downloads[download_id]
    
    try:
        for transfer in list(core.downloads.transfers.values()):
            if transfer.username == username and transfer.virtual_path == file_path:
                core.downloads.abort_transfer(transfer)
                break
        
        if download_id in soulseek_manager.download_status:
            del soulseek_manager.download_status[download_id]
        
        return {"message": "Download cancelled", "download_id": download_id}
    except Exception as e:
        logging.error(f"Error cancelling download {download_id}: {e}")
        return {"message": "Download removed from queue", "download_id": download_id}