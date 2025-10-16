import os
import requests
import logging
from typing import Dict, Any, Optional

class PlaylistService:
    def __init__(self, data_path: str):
        self.data_path = data_path
        self.covers_path = os.path.join(self.data_path, 'covers')
        os.makedirs(self.covers_path, exist_ok=True)

    def download_playlist_thumbnail(self, playlist_name: str, thumbnail_url: Optional[str]) -> Optional[str]:
        if not thumbnail_url:
            return None

        try:
            response = requests.get(thumbnail_url, stream=True)
            response.raise_for_status()

            # Create a safe filename for the playlist thumbnail
            safe_playlist_name = "".join([c for c in playlist_name if c.isalpha() or c.isdigit() or c==' ']).rstrip()
            file_name = f"playlist_{safe_playlist_name}.jpg".replace(' ', '_')
            thumbnail_path = os.path.join(self.covers_path, file_name)

            with open(thumbnail_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            logging.info(f"Successfully downloaded and saved playlist thumbnail to {thumbnail_path}")
            return file_name.replace('\\', '/')

        except requests.exceptions.RequestException as e:
            logging.error(f"Error downloading playlist thumbnail from {thumbnail_url}: {e}")
            return None
