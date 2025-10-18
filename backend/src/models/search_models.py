from pydantic import BaseModel
from typing import Optional, List

class SearchQuery(BaseModel):
    query: str
    artist: Optional[str] = None
    song: Optional[str] = None

class SearchResult(BaseModel):
    path: str
    size: int
    username: str
    extension: Optional[str] = None
    bitrate: Optional[int] = None
    quality: Optional[str] = None
    length: Optional[str] = None

class AlbumResult(BaseModel):
    album: str
    files: List[SearchResult]

class UserResult(BaseModel):
    username: str
    albums: List[AlbumResult]

class GroupedSearchResults(BaseModel):
    search_id: str
    results: List[UserResult]