from fastapi import APIRouter, HTTPException
from models.playlist_models import Playlist, CreatePlaylistRequest, UpdatePlaylistRequest, AddSongToPlaylistRequest
from core.library_service import LibraryService
from core.playlist_service import PlaylistService
from typing import List
import uuid
from datetime import datetime

router = APIRouter()

library_service: LibraryService
playlist_service: PlaylistService

@router.post("/playlists", response_model=Playlist)
async def create_playlist(request: CreatePlaylistRequest):
    playlist_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    thumbnail_path = playlist_service.download_playlist_thumbnail(request.name, request.thumbnail)

    playlist = Playlist(
        id=playlist_id,
        name=request.name,
        description=request.description,
        thumbnail=thumbnail_path,
        songs=[],
        createdAt=now,
        updatedAt=now
    )
    return library_service.create_playlist(playlist)

@router.get("/playlists", response_model=List[Playlist])
async def get_all_playlists():
    return library_service.get_all_playlists()

@router.get("/playlists/{playlist_id}", response_model=Playlist)
async def get_playlist(playlist_id: str):
    playlist = library_service.get_playlist(playlist_id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return playlist

@router.put("/playlists/{playlist_id}", response_model=Playlist)
async def update_playlist(playlist_id: str, request: UpdatePlaylistRequest):
    updates = request.dict(exclude_unset=True)
    if 'thumbnail' in updates and updates['thumbnail']:
        playlist = library_service.get_playlist(playlist_id)
        if playlist:
            thumbnail_path = playlist_service.download_playlist_thumbnail(playlist.name, updates['thumbnail'])
            updates['thumbnail'] = thumbnail_path

    return library_service.update_playlist(playlist_id, updates)

@router.delete("/playlists/{playlist_id}", status_code=204)
async def delete_playlist(playlist_id: str):
    library_service.delete_playlist(playlist_id)
    return

@router.post("/playlists/{playlist_id}/songs", response_model=Playlist)
async def add_song_to_playlist(playlist_id: str, request: AddSongToPlaylistRequest):
    return library_service.add_song_to_playlist(playlist_id, request.song_path)

@router.delete("/playlists/{playlist_id}/songs/{song_path:path}", response_model=Playlist)
async def remove_song_from_playlist(playlist_id: str, song_path: str):
    return library_service.remove_song_from_playlist(playlist_id, song_path)