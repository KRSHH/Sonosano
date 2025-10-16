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

search_completion_status = {}
last_result_count = {}

@router.get("/search/soulseek/results/{token}")
async def get_search_results(token: int):
    """Get current search results for a given token."""
    events.process_thread_events()
    
    results = soulseek_manager.search_results.get(token, [])
    formatted_results = [
        SearchResult(
            path=result['path'],
            size=result['size'],
            username=result['username'],
            extension=result.get('extension'),
            bitrate=result.get('bitrate'),
            quality=result.get('quality'),
            length=result.get('length')
        ) for result in results
    ]
    
    current_count = len(formatted_results)
    
    if token not in last_result_count:
        last_result_count[token] = 0
        search_completion_status[token] = 0
    
    if current_count == last_result_count[token] and current_count > 0:
        search_completion_status[token] += 1
    else:
        search_completion_status[token] = 0
    
    last_result_count[token] = current_count
    
    is_complete = (
        (current_count > 0 and search_completion_status[token] >= 3) or
        current_count >= 100 or
        (token not in soulseek_manager.search_tokens and current_count > 0)
    )
    
    if is_complete and token in last_result_count:
        del last_result_count[token]
        del search_completion_status[token]
    
    actual_query = soulseek_manager.search_tokens.get(token, "")
    
    return {
        "results": formatted_results,
        "is_complete": is_complete,
        "result_count": len(formatted_results),
        "actual_query": actual_query
    }