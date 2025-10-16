from pydantic import BaseModel
from typing import List, Optional

class Playlist(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    songs: List[str] = []
    createdAt: str
    updatedAt: str

class CreatePlaylistRequest(BaseModel):
    name: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None

class UpdatePlaylistRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None

class AddSongToPlaylistRequest(BaseModel):
    song_path: str