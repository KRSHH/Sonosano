from pydantic import BaseModel
from typing import Optional, Dict, Any

class ShowInExplorerRequest(BaseModel):
    filePath: str

class AddFileRequest(BaseModel):
    filePath: str
    metadata: Optional[Dict[str, Any]] = None

class StoreMetadataRequest(BaseModel):
    filename: str
    metadata: Dict[str, Any]