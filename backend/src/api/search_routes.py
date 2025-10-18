from fastapi import APIRouter, HTTPException
from core.search_service import search_service
from models.search_models import SearchQuery, SearchResult
from core.soulseek_manager import SoulseekManager
from pynicotine.events import events

router = APIRouter()

soulseek_manager: SoulseekManager

@router.get("/search")
async def search(provider: str, q: str):
    """
    Performs a search using the specified provider.
    """
    if not q:
        raise HTTPException(status_code=400, detail="Query parameter 'q' is required.")
    
    results = search_service.search(provider, q)
    
    if "error" in results:
        raise HTTPException(status_code=500, detail=results["error"])
        
    return results

@router.post("/search/soulseek")
async def search_files(query: SearchQuery):
    """Start a search on Soulseek network with fallback logic."""
    if not soulseek_manager.logged_in:
        raise HTTPException(status_code=503, detail="Not connected to Soulseek")
    
    try:
        token, actual_query = soulseek_manager.perform_search_with_fallback(query.artist, query.song, query.query)
        
        if token is None:
            return {"search_token": None, "actual_query": actual_query}
        
        soulseek_manager.search_tokens[token] = actual_query
        
        return {"search_token": token, "actual_query": actual_query}
    except Exception as e:
        if "cancelled" in str(e).lower():
            return {"search_token": None, "actual_query": "", "cancelled": True}
        else:
            raise e
