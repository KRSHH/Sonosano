from fastapi import APIRouter, HTTPException, Query as FastQuery, Request, BackgroundTasks
from fastapi.responses import FileResponse
from models.library_models import AddFileRequest, ShowInExplorerRequest, StoreMetadataRequest
from core.library_service import LibraryService
from core.song_processor import SongProcessor
from core.forensic_visualizer import analyze_audio_for_visualization, create_visual_report
from pynicotine.config import config
import os
import shutil
import glob
import logging
import subprocess
import sys
from tinydb import Query as TinyDBQuery

router = APIRouter()

library_service: LibraryService
song_processor: SongProcessor


@router.get("/library/songs")
async def get_library_songs():
    """Get all songs from the library."""
    return library_service.get_all_songs()

@router.get("/library/lyrics")
async def get_lyrics(filePath: str = FastQuery(...)):
    """Get lyrics for a specific song from the local cache."""
    logging.info(f"Received request for lyrics for file path: {filePath}")
    
    # Use the absolute path from the song processor to query the lyrics table
    music_directory = config.sections["transfers"]["downloaddir"]
    absolute_path = os.path.join(music_directory, filePath)
    
    Lyrics = TinyDBQuery()
    lyrics_data = library_service.lyrics_table.get(Lyrics.file_path == absolute_path)
    
    if not lyrics_data:
        logging.info(f"Lyrics not found in local cache for: {absolute_path}")
        raise HTTPException(status_code=404, detail="Lyrics not found in local cache.")
    
    logging.info(f"Found lyrics in local cache for: {absolute_path}")
    return lyrics_data

@router.post("/library/sync")
async def sync_library():
    """Synchronize the library with the file system."""
    db_files = {song['path'] for song in library_service.get_all_songs()}
    
    music_directory = config.sections["transfers"]["downloaddir"]
    fs_files = set()
    for ext in {'.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma', '.opus'}:
        fs_files.update(glob.glob(os.path.join(music_directory, f"**/*{ext}"), recursive=True))

    new_files = fs_files - db_files
    deleted_files = db_files - fs_files

    for file_path in deleted_files:
        library_service.remove_song(file_path)

    for file_path in new_files:
        song_processor.process_new_song(file_path)

    return {"message": "Sync completed", "new": len(new_files), "deleted": len(deleted_files)}

@router.get("/library/songs/pending-review")
async def get_songs_pending_review():
    """Get all songs that are pending metadata review."""
    songs = library_service.get_all_songs()
    pending_review = [
        song for song in songs
        if song.get('metadata', {}).get('metadata_status') == 'pending_review'
    ]
    return pending_review


@router.post("/library/songs/process")
async def process_library_song(request: ShowInExplorerRequest):
    """
    Triggers the full metadata processing logic for a single song file already in the library.
    """
    file_path = request.filePath
    logging.info(f"On-demand processing triggered for: {file_path}")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found at the specified path.")

    try:
        # This will re-run the entire metadata fallback and enrichment process
        song_processor.process_new_song(file_path)
        return {"message": f"Successfully triggered processing for {os.path.basename(file_path)}"}
    except Exception as e:
        # Log the full error for debugging
        logging.error(f"Error during on-demand processing for {file_path}: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during song processing.")

def run_forensic_analysis(file_path: str, output_path: str):
    """
    A helper function to run the CPU-intensive analysis in the background.
    """
    try:
        logging.info(f"Starting background forensic analysis for: {file_path}")
        analysis_data, plot_data = analyze_audio_for_visualization(file_path)
        
        if not plot_data:
            error_message = analysis_data if isinstance(analysis_data, str) else "Failed to analyze audio for visualization."
            logging.error(f"Forensic analysis failed for {file_path}: {error_message}")
            return

        create_visual_report(analysis_data, plot_data, output_path)
        logging.info(f"Forensic report successfully generated at: {output_path}")

        # Open the file with the default viewer after generation
        if sys.platform == "win32":
            os.startfile(output_path)
        elif sys.platform == "darwin":
            subprocess.Popen(["open", output_path])
        else:
            subprocess.Popen(["xdg-open", output_path])
            
    except Exception as e:
        logging.error(f"Error during background forensic report generation for {file_path}: {e}", exc_info=True)


@router.post("/library/songs/generate-forensics")
async def generate_forensics_for_song(request: ShowInExplorerRequest, background_tasks: BackgroundTasks):
    """
    Triggers a background task to generate and open a forensic analysis image.
    """
    relative_path = request.filePath
    music_directory = config.sections["transfers"]["downloaddir"]
    file_path = os.path.join(music_directory, relative_path)
    
    logging.info(f"Forensic generation request received for: {relative_path}")

    if not os.path.exists(file_path):
        logging.error(f"File not found at constructed absolute path: {file_path}")
        raise HTTPException(status_code=404, detail="File not found.")

    temp_dir = os.path.join(library_service.data_path, "temp")
    os.makedirs(temp_dir, exist_ok=True)
    
    file_name = os.path.splitext(os.path.basename(file_path))[0]
    output_filename = f"forensic_{file_name}.png"
    output_path = os.path.join(temp_dir, output_filename)

    # If the report already exists, just open it without regenerating
    if os.path.exists(output_path):
        logging.info(f"Report already exists, opening: {output_path}")
        if sys.platform == "win32":
            os.startfile(output_path)
        elif sys.platform == "darwin":
            subprocess.Popen(["open", output_path])
        else:
            subprocess.Popen(["xdg-open", output_path])
        return {"message": "Forensic report already exists and is being opened."}

    # Add the long-running task to the background
    background_tasks.add_task(run_forensic_analysis, file_path, output_path)

    return {"message": "Forensic generation has been started in the background."}