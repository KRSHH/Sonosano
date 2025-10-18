from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from .system_models import SystemStatus
from .search_models import SearchResult

class DownloadRequest(BaseModel):
    username: str
    file_path: str
    size: int
    metadata: Optional[Dict[str, Any]] = None

class DownloadStatus(BaseModel):
    status: str
    progress: int
    total: int
    percent: float
    speed: Optional[int] = None
    queuePosition: Optional[int] = None
    errorMessage: Optional[str] = None

class DownloadedFile(BaseModel):
    name: str
    path: str
    size: int
    extension: str

class DownloadsAndStatusResponse(BaseModel):
    downloads: List[Dict[str, Any]]
    system_status: SystemStatus

class AlbumDownloadRequest(BaseModel):
    username: str
    album: str
    artist: str
    files: List[SearchResult]
    metadata: Optional[Dict[str, Any]] = None