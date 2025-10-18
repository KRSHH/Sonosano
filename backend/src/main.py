import sys
import logging
import threading
import time
import multiprocessing
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import glob

from core.soulseek_manager import SoulseekManager
from core.library_service import LibraryService
from core.metadata_service import MetadataService
from core.romanization_service import RomanizationService
from core.song_processor import SongProcessor
from core.playlist_service import PlaylistService
from api import search_routes, download_routes, library_routes, system_routes, playlist_routes, websocket_routes
from api.search_routes import router as search_router
from core.config_utils import get_config_path, get_documents_folder
from pynicotine.events import events
import asyncio

import os
import json
import random
import string
from pynicotine.config import config as pynicotine_config
from configparser import ConfigParser

def create_default_config_if_not_exists():
    """Create a default config file if one doesn't exist."""
    config_path = get_config_path()
    if not os.path.exists(config_path):
        config = ConfigParser()
        documents_folder = get_documents_folder()
        default_data_path = os.path.join(documents_folder, "Sonosano_Songs")
        os.makedirs(default_data_path, exist_ok=True)
        
        config['Paths'] = {'dataPath': default_data_path}
        with open(config_path, 'w') as f:
            config.write(f)

def load_data_path():
    """Load the data path from the config file."""
    create_default_config_if_not_exists()
    config_path = get_config_path()
    config = ConfigParser()
    config.read(config_path)
    if 'Paths' in config and 'dataPath' in config['Paths']:
        return config['Paths']['dataPath']
    return None

if getattr(sys, 'frozen', False):
    multiprocessing.freeze_support()
    application_path = os.path.dirname(sys.executable)
else:
    application_path = os.path.dirname(os.path.abspath(__file__))

data_path = load_data_path()
if data_path is None:
    # This fallback is now less likely to be used, but kept for safety.
    documents_folder = get_documents_folder()
    data_path = os.path.join(documents_folder, "Sonosano_Songs")
    os.makedirs(data_path, exist_ok=True)

config_file_path = os.path.join(data_path, "config.ini")
misc_file_path = os.path.join(data_path, "misc.json")

logging.info(f"Using data folder at: {data_path}")
logging.info(f"Pynicotine config file: {config_file_path}")
logging.info(f"Misc config file (for credentials): {misc_file_path}")

pynicotine_config.set_data_folder(data_path)
pynicotine_config.set_config_file(config_file_path)

def generate_random_credentials():
    characters = string.ascii_letters + string.digits
    username = ''.join(random.choice(characters) for _ in range(8))
    password = ''.join(random.choice(characters) for _ in range(8))
    return username, password

def load_or_create_misc_config():
    if os.path.exists(misc_file_path) and os.path.getsize(misc_file_path) > 0:
        try:
            with open(misc_file_path, 'r', encoding='utf-8') as f:
                misc_config = json.load(f)
                if 'credentials' in misc_config and misc_config['credentials'].get('username') and misc_config['credentials'].get('password'):
                    return misc_config
        except Exception as e:
            logging.error(f"Error loading misc.json: {e}, creating new one...")
    username, password = generate_random_credentials()
    misc_config = {'credentials': {'username': username, 'password': password}}
    try:
        os.makedirs(data_path, exist_ok=True)
        with open(misc_file_path, 'w', encoding='utf-8') as f:
            json.dump(misc_config, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logging.error(f"Error saving misc.json: {e}")
    return misc_config

misc_config = load_or_create_misc_config()
pynicotine_config.sections["server"]["login"] = misc_config['credentials']['username']
pynicotine_config.sections["server"]["passw"] = misc_config['credentials']['password']
pynicotine_config.load_config(isolated_mode=True)
pynicotine_config.sections["server"]["login"] = misc_config['credentials']['username']
pynicotine_config.sections["server"]["passw"] = misc_config['credentials']['password']
pynicotine_config.write_configuration()

app = FastAPI(title="Sonosano API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

metadata_service = MetadataService(data_path)
library_service = LibraryService(metadata_service, data_path)
romanization_service = RomanizationService()
song_processor = SongProcessor(library_service, metadata_service, romanization_service, data_path)
soulseek_manager = SoulseekManager(library_service, data_path)
playlist_service = PlaylistService(data_path)

search_routes.soulseek_manager = soulseek_manager
download_routes.soulseek_manager = soulseek_manager
download_routes.playlist_service = playlist_service
download_routes.library_service = library_service
websocket_routes.soulseek_manager = soulseek_manager
library_routes.library_service = library_service
playlist_routes.library_service = library_service
playlist_routes.playlist_service = playlist_service
library_routes.song_processor = song_processor
system_routes.soulseek_manager = soulseek_manager
system_routes.romanization_service = romanization_service
system_routes.data_path = data_path

app.include_router(search_router, prefix="", tags=["search"])
app.include_router(download_routes.router, prefix="", tags=["download"])
app.include_router(library_routes.router, prefix="", tags=["library"])
app.include_router(system_routes.router, prefix="", tags=["system"])
app.include_router(playlist_routes.router, prefix="", tags=["playlists"])
app.include_router(websocket_routes.router, prefix="", tags=["websockets"])

covers_path = os.path.join(data_path, "covers")
os.makedirs(covers_path, exist_ok=True)
app.mount("/covers", StaticFiles(directory=covers_path), name="covers")

temp_path = os.path.join(data_path, "temp")
os.makedirs(temp_path, exist_ok=True)
app.mount("/temp", StaticFiles(directory=temp_path), name="temp")

from watchdog.observers import Observer
from core.file_watcher import MusicFileHandler

def long_running_startup_tasks():
    def handle_new_search_results(results):
        asyncio.run(websocket_routes.broadcast_search_results(results['search_id'], results['results']))

    events.connect("new_search_results", handle_new_search_results)

    soulseek_manager.initialize_soulseek()
    event_thread = threading.Thread(target=soulseek_manager.process_events, daemon=True)
    event_thread.start()

    def initial_sync():
        logging.info("Waiting for Soulseek login before initial sync...")
        if not soulseek_manager.login_event.wait(timeout=60):
            logging.warning("Soulseek login timed out. Initial sync may be incomplete.")
            return
            
        logging.info("=== Starting initial library sync and processing ===")
        all_songs_in_db = {s['path'] for s in library_service.get_all_songs()}
        music_directory = pynicotine_config.sections["transfers"]["downloaddir"]
        logging.info(f"Scanning music directory for sync: {music_directory}")
        
        fs_files = set()
        for ext in {'.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma', '.opus'}:
            # Use relative paths for comparison
            for file_path in glob.glob(os.path.join(music_directory, f"**/*{ext}"), recursive=True):
                fs_files.add(os.path.relpath(file_path, music_directory))

        new_files = fs_files - all_songs_in_db
        deleted_files = all_songs_in_db - fs_files
        logging.info(f"Sync found {len(new_files)} new files and {len(deleted_files)} deleted files.")

        for file_path in deleted_files:
            logging.info(f"Sync: Removing deleted song from DB: {file_path}")
            library_service.remove_song(file_path)

        logging.info(f"Processing {len(new_files)} new files for metadata, covers, and lyrics.")
        for file_path in new_files:
            if file_path not in song_processor._currently_processing:
                # Reconstruct the absolute path for the song processor
                abs_path = os.path.join(music_directory, file_path)
                song_processor.process_new_song(abs_path)
        logging.info("=== Initial library sync and processing finished. ===")

    sync_thread = threading.Thread(target=initial_sync, daemon=True)
    sync_thread.start()

    def start_watcher():
        music_directory = pynicotine_config.sections["transfers"]["downloaddir"]
        event_handler = MusicFileHandler(library_service, song_processor, music_directory)
        observer = Observer()
        observer.schedule(event_handler, music_directory, recursive=True)
        observer.start()
        try:
            while True: time.sleep(1)
        except KeyboardInterrupt:
            observer.stop()
        observer.join()

    watcher_thread = threading.Thread(target=start_watcher, daemon=True)
    watcher_thread.start()

@app.on_event("startup")
async def startup_event():
    startup_thread = threading.Thread(target=long_running_startup_tasks, daemon=True)
    startup_thread.start()

def main():
    import uvicorn
    import logging

    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    main()