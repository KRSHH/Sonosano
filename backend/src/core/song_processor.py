import os
import requests
import json
import threading
from typing import Dict, Any
from mutagen import File as MutagenFile
import logging
from core.library_service import LibraryService
from core.metadata_service import MetadataService
from core.romanization_service import RomanizationService
from core.audio_forensics import analyze_audio_final # Import the new function
from tinydb import Query

class SongProcessor:
    def __init__(self, library_service: LibraryService, metadata_service: MetadataService, romanization_service: RomanizationService, data_path: str):
        self.library_service = library_service
        self.metadata_service = metadata_service
        self.romanization_service = romanization_service
        self.data_path = data_path
        self.covers_path = os.path.join(self.data_path, 'covers')
        os.makedirs(self.covers_path, exist_ok=True)
        self._processing_lock = threading.Lock()
        self._currently_processing = set()

    def process_new_song(self, file_path: str):
        """
        Processes a new song file, extracts metadata, and adds it to the library.
        """
        with self._processing_lock:
            if file_path in self._currently_processing:
                logging.info(f"Already processing {file_path}, skipping.")
                return
            self._currently_processing.add(file_path)

        try:
            logging.info(f"==> Starting processing for new song: {file_path}")
            if not os.path.exists(file_path):
                logging.warning(f"File not found, aborting process: {file_path}")
                return

            # Step 1: Extract and Merge Metadata from all sources
            filename = os.path.basename(file_path)
            logging.info(f"Step 1: Extracting and merging metadata for '{filename}'")
            download_metadata = self.library_service.download_metadata.get(filename)
            embedded_metadata = self.metadata_service.extract_metadata_from_file(file_path)
            metadata = self.metadata_service.merge_metadata(
                file_metadata=embedded_metadata,
                search_metadata=download_metadata,
                filename=filename
            )
            metadata['size'] = os.path.getsize(file_path)
            logging.info(f"Merged metadata: {metadata.get('title')} - {metadata.get('artist')}")

            # Step 1.5: Perform Audio Analysis for Lossless Files
            file_ext = os.path.splitext(file_path)[1].lower()
            if file_ext in ['.wav', '.flac']:
                logging.info(f"Performing audio analysis for {filename}")
                analysis_verdict = analyze_audio_final(file_path)
                metadata['is_fake'] = analysis_verdict == 'Fake'
                logging.info(f"Analysis verdict: {analysis_verdict}, is_fake set to: {metadata['is_fake']}")

            # Step 2: Validate Core Metadata and Fetch from MusicBrainz if Necessary
            logging.info("Step 2: Validating core metadata")
            if not metadata.get('title') or not metadata.get('artist'):
                self._fetch_metadata_from_musicbrainz(metadata)
                if not metadata.get('title') or not metadata.get('artist'):
                    metadata['metadata_status'] = 'pending_review'

            # Step 3: Handle Cover Art Fallback (after all metadata is gathered)
            logging.info("Step 3: Handling cover art")
            if not metadata.get('coverArt'):
                if not metadata.get('album'):
                    self._fetch_metadata_from_musicbrainz(metadata)
                self._fetch_cover_art(metadata)

            # Step 4: Handle Lyrics Fetching (after all metadata is gathered)
            logging.info("Step 4: Handling lyrics")
            self._process_lyrics(file_path, metadata)

            # Step 5: Finalize and Add to Database
            logging.info("Step 5: Finalizing and adding to database")
            song_data = {
                'path': os.path.relpath(file_path, os.path.join(self.data_path, "downloads")),
                'metadata': metadata,
                'date_added': os.path.getctime(file_path)
            }
            self.library_service.add_or_update_song(song_data)
            logging.info(f"<== Finished processing for song: {filename}")
        finally:
            with self._processing_lock:
                if file_path in self._currently_processing:
                    self._currently_processing.remove(file_path)

    def _fetch_cover_art(self, metadata: Dict[str, Any]):
        artist = metadata.get('artist')
        album = metadata.get('album')
        if not artist or not album:
            return

        try:
            mb_url = f"http://musicbrainz.org/ws/2/release/?query=artist:{artist} AND release:{album}&fmt=json"
            headers = {'User-Agent': 'Sonosano/1.0.0 ( https://github.com/KRSHH/Sonosano )'}
            response = requests.get(mb_url, headers=headers)
            response.raise_for_status()
            mb_data = response.json()

            if mb_data.get('releases'):
                release_id = mb_data['releases'][0]['id']
                ca_url = f"http://coverartarchive.org/release/{release_id}"
                response = requests.get(ca_url, headers=headers)
                if response.status_code == 200:
                    ca_data = response.json()
                    if ca_data.get('images'):
                        image_url = ca_data['images'][0]['thumbnails']['large']
                        image_response = requests.get(image_url)
                        image_response.raise_for_status()
                        file_name = f"{artist}_{album}.jpg".replace('/', '_')
                        cover_path = os.path.join(self.covers_path, file_name)
                        with open(cover_path, 'wb') as f:
                            f.write(image_response.content)
                        metadata['coverArt'] = file_name.replace('\\', '/')
                        metadata['coverArtUrl'] = image_url
        except requests.exceptions.RequestException as e:
            logging.error(f"Error fetching cover art: {e}")

    def _process_lyrics(self, file_path: str, metadata: Dict[str, Any]):
        logging.info(f"Processing lyrics for: {file_path}")
        cached_lyrics = self.library_service.get_lyrics(file_path)
        if cached_lyrics:
            logging.info(f"Lyrics for '{os.path.basename(file_path)}' found in cache. Skipping fetch.")
            return

        logging.info(f"Lyrics for '{os.path.basename(file_path)}' not in cache. Attempting to fetch.")
        artist = metadata.get('artist')
        title = metadata.get('title')
        if not artist or not title:
            logging.warning(f"Skipping lyrics fetch for '{os.path.basename(file_path)}' due to missing artist/title metadata.")
            return

        try:
            logging.info(f"Fetching lyrics from lrclib for: Title='{title}', Artist='{artist}'")
            lrc_url = f"https://lrclib.net/api/get"
            params = {'artist_name': artist, 'track_name': title}
            response = requests.get(lrc_url, params=params)
            response.raise_for_status()
            
            if response.status_code == 404 or not response.content:
                logging.info(f"lrclib returned 404 or empty response for '{title}' by '{artist}'")
                return

            lrc_data = response.json()

            if lrc_data and (lrc_data.get('syncedLyrics') or lrc_data.get('plainLyrics')):
                plain_lyrics = lrc_data.get('plainLyrics')
                synced_lyrics = lrc_data.get('syncedLyrics')
                plain_lyrics_romanized = self.romanization_service.romanize(plain_lyrics) if plain_lyrics else None
                synced_lyrics_romanized = self.romanization_service.romanize(synced_lyrics) if synced_lyrics else None

                lyrics_data = {
                    'file_path': file_path,
                    'plain_lyrics': plain_lyrics,
                    'synced_lyrics': synced_lyrics,
                    'plain_lyrics_romanized': plain_lyrics_romanized,
                    'synced_lyrics_romanized': synced_lyrics_romanized,
                }
                logging.info(f"Saving lyrics to database for file_path: '{file_path}'")
                self.library_service.upsert_lyrics(lyrics_data, file_path)
                logging.info(f"Successfully fetched and cached lyrics for '{os.path.basename(file_path)}'")
            else:
                logging.info(f"No lyrics content found in lrclib response for '{title}' by '{artist}'")

        except requests.exceptions.RequestException as e:
            if e.response and e.response.status_code == 404:
                logging.info(f"No lyrics found on lrclib (404) for '{title}' by '{artist}'")
            else:
                logging.error(f"Network error fetching lyrics for '{os.path.basename(file_path)}': {e}")
        except json.JSONDecodeError:
            logging.warning(f"Could not decode JSON lyrics response for '{title}' by '{artist}'. It might not be available.")
        except Exception as e:
            logging.error(f"An unexpected error occurred during lyrics processing for '{os.path.basename(file_path)}': {e}")

    def _fetch_metadata_from_musicbrainz(self, metadata: Dict[str, Any]):
        title = metadata.get('title')
        artist = metadata.get('artist')
        query_parts = []
        if artist: query_parts.append(f"artist:{artist}")
        if title: query_parts.append(f"recording:{title}")
        if not query_parts: return

        try:
            mb_url = f"http://musicbrainz.org/ws/2/recording/?query={' AND '.join(query_parts)}&fmt=json"
            headers = {'User-Agent': 'Sonosano/1.0.0 ( https://github.com/KRSHH/Sonosano )'}
            response = requests.get(mb_url, headers=headers)
            response.raise_for_status()
            mb_data = response.json()

            if mb_data.get('recordings'):
                top_recording = mb_data['recordings'][0]
                if not metadata.get('title') and top_recording.get('title'):
                    metadata['title'] = top_recording['title']
                if not metadata.get('artist') and top_recording.get('artist-credit'):
                    metadata['artist'] = top_recording['artist-credit'][0]['name']
                if not metadata.get('album') and top_recording.get('releases'):
                    metadata['album'] = top_recording['releases'][0]['title']
        except requests.exceptions.RequestException as e:
            logging.error(f"Error fetching metadata from MusicBrainz: {e}")