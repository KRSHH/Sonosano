from pydantic import BaseModel
from typing import Optional

class SystemStatus(BaseModel):
    backend_status: str
    soulseek_status: str
    soulseek_username: Optional[str] = None
    active_uploads: int
    active_downloads: int

class RomanizeRequest(BaseModel):
    text: str

class ConfigRequest(BaseModel):
    dataPath: str