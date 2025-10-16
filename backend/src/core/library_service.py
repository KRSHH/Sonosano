import os
import json
import glob
import sys
import threading
from typing import List, Dict, Any
from tinydb import TinyDB, Query
from .metadata_service import MetadataService
from pynicotine.config import config
from models.playlist_models import Playlist
from datetime import datetime
import logging

class LibraryService:
    def __init__(self, metadata_service: MetadataService, data_path: str):
        self.metadata_service = metadata_service
        self.data_path = data_path
        db_path = os.path.join(data_path, 'library.db')
        logging.info(f"Initializing database at: {db_path}")
        self.db_lock = threading.Lock()
        
        # Ensure the db file is not empty
        if not os.path.exists(db_path) or os.path.getsize(db_path) == 0:
            with open(db_path, 'w') as f:
                f.write('{}')

        self.db = TinyDB(db_path)
        self.songs_table = self.db.table('songs')
        self.lyrics_table = self.db.table('lyrics')
        self.playlists_table = self.db.table('playlists')
        self.download_metadata = {}

    def get_all_songs(self) -> List[Dict]:
        with self.db_lock:
            return self.songs_table.all()

    def add_or_update_song(self, song_data: Dict):
        with self.db_lock:
            self.songs_table.upsert(song_data, Query().path == song_data['path'])

    def remove_song(self, file_path: str):
        with self.db_lock:
            self.songs_table.remove(Query().path == file_path)

    def get_lyrics(self, file_path: str):
        with self.db_lock:
            return self.lyrics_table.get(Query().file_path == file_path)

    def upsert_lyrics(self, lyrics_data: Dict, file_path: str):
        with self.db_lock:
            self.lyrics_table.upsert(lyrics_data, Query().file_path == file_path)

    def add_download_metadata(self, filename: str, metadata: Dict[str, Any]):
        """
        Stores metadata for a file that is being downloaded.
        This data is persisted and used later by the SongProcessor.
        """
        # The key for the metadata dictionary is the simple filename.
        self.download_metadata[filename] = metadata
        logging.info(f"Stored download-time metadata for '{filename}'")

    def create_playlist(self, playlist: Playlist) -> Playlist:
        with self.db_lock:
            self.playlists_table.insert(playlist.dict())
            return playlist

    def get_all_playlists(self) -> List[Playlist]:
        with self.db_lock:
            return [Playlist(**p) for p in self.playlists_table.all()]

    def get_playlist(self, playlist_id: str) -> Playlist:
        with self.db_lock:
            data = self.playlists_table.get(Query().id == playlist_id)
            return Playlist(**data) if data else None

    def update_playlist(self, playlist_id: str, updates: Dict[str, Any]) -> Playlist:
        with self.db_lock:
            updates['updatedAt'] = datetime.utcnow().isoformat()
            self.playlists_table.update(updates, Query().id == playlist_id)
            data = self.playlists_table.get(Query().id == playlist_id)
            return Playlist(**data) if data else None

    def delete_playlist(self, playlist_id: str):
        with self.db_lock:
            self.playlists_table.remove(Query().id == playlist_id)

    def add_song_to_playlist(self, playlist_id: str, song_path: str) -> Playlist:
        with self.db_lock:
            playlist_data = self.playlists_table.get(Query().id == playlist_id)
            if playlist_data:
                playlist = Playlist(**playlist_data)
                if song_path not in playlist.songs:
                    playlist.songs.append(song_path)
                    playlist.updatedAt = datetime.utcnow().isoformat()
                    self.playlists_table.update(playlist.dict(), Query().id == playlist_id)
                
                return playlist
            return None

    def remove_song_from_playlist(self, playlist_id: str, song_path: str) -> Playlist:
        with self.db_lock:
            playlist_data = self.playlists_table.get(Query().id == playlist_id)
            if playlist_data:
                playlist = Playlist(**playlist_data)
                if song_path in playlist.songs:
                    playlist.songs.remove(song_path)
                    playlist.updatedAt = datetime.utcnow().isoformat()
                    self.playlists_table.update(playlist.dict(), Query().id == playlist_id)
                
                return playlist
            return None
