import os
import logging
from watchdog.events import FileSystemEventHandler
from core.library_service import LibraryService
from core.song_processor import SongProcessor

class MusicFileHandler(FileSystemEventHandler):
    def __init__(self, library_service: LibraryService, song_processor: SongProcessor, music_directory: str):
        self.library_service = library_service
        self.song_processor = song_processor
        self.music_directory = music_directory

    def on_created(self, event):
        if not event.is_directory and self._is_audio_file(event.src_path):
            logging.info(f"New audio file detected: {event.src_path}")
            # Process with the absolute path
            self.song_processor.process_new_song(event.src_path)

    def on_deleted(self, event):
        if not event.is_directory and self._is_audio_file(event.src_path):
            logging.info(f"Audio file deleted: {event.src_path}")
            # Convert to relative path for removal from DB
            relative_path = os.path.relpath(event.src_path, self.music_directory)
            self.library_service.remove_song(relative_path)

    def _is_audio_file(self, path: str) -> bool:
        return path.lower().endswith(('.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma', '.opus'))