import asyncio
import logging
from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from core.soulseek_manager import SoulseekManager
from models.search_models import GroupedSearchResults

router = APIRouter()
soulseek_manager: SoulseekManager

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.client_searches: Dict[str, List[str]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.client_searches[client_id] = []
        logging.info(f"WebSocket client connected: {client_id}")

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.client_searches:
            # Stop any active searches for this client
            for search_id in self.client_searches[client_id]:
                if search_id in soulseek_manager.search_tokens:
                    del soulseek_manager.search_tokens[search_id]
                if search_id in soulseek_manager.search_results:
                    del soulseek_manager.search_results[search_id]
            del self.client_searches[client_id]
        logging.info(f"WebSocket client disconnected: {client_id}")

    async def send_json(self, client_id: str, message: dict):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_json(message)

    def add_search_to_client(self, client_id: str, search_id: str):
        if client_id in self.client_searches:
            self.client_searches[client_id].append(search_id)

    def remove_search_from_client(self, client_id: str, search_id: str):
        if client_id in self.client_searches and search_id in self.client_searches[client_id]:
            self.client_searches[client_id].remove(search_id)
            if search_id in soulseek_manager.search_tokens:
                del soulseek_manager.search_tokens[search_id]
            if search_id in soulseek_manager.search_results:
                del soulseek_manager.search_results[search_id]

manager = ConnectionManager()

@router.websocket("/ws/search/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            search_id = data.get("searchId")
            query = data.get("query")

            if action == "start_search" and search_id and query:
                logging.info(f"Starting Soulseek search for client {client_id} with search ID {search_id}")
                token, actual_query = soulseek_manager.perform_search_with_fallback(None, None, query)
                if token is not None:
                    soulseek_manager.search_tokens[str(token)] = actual_query
                    manager.add_search_to_client(client_id, str(token))
                    await manager.send_json(client_id, {"status": "Search started", "searchId": str(token), "actualQuery": actual_query})
                else:
                    await manager.send_json(client_id, {"status": "Search failed", "searchId": search_id})

            elif action == "stop_search" and search_id:
                logging.info(f"Stopping Soulseek search for client {client_id} with search ID {search_id}")
                manager.remove_search_from_client(client_id, search_id)
                await manager.send_json(client_id, {"status": "Search stopped", "searchId": search_id})

    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        logging.error(f"WebSocket error for client {client_id}: {e}")
        manager.disconnect(client_id)

async def broadcast_search_results(search_id: str, results: dict):
    """Event handler to broadcast grouped search results to the correct client."""
    try:
        # Find which client initiated this search
        client_id = None
        for cid, searches in manager.client_searches.items():
            if search_id in searches:
                client_id = cid
                break
        
        if client_id:
            # This is a simplified structure for now. We will build the full GroupedSearchResults later.
            message = {"searchId": search_id, "results": results}
            await manager.send_json(client_id, message)
    except Exception as e:
        logging.error(f"Error broadcasting search results for search {search_id}: {e}")