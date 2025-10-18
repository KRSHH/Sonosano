import { getBackendUrl, setBackendUrl } from './backendUrl'
import { Playlist, Song, AudioMetadata, SoulseekFile, DownloadsAndStatusResponse } from '../types'

class ApiClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = getBackendUrl()
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url
    setBackendUrl(url)
  }

  /**
   * Fetches data from the backend.
   * @param endpoint The API endpoint to call.
   * @param options The options for the fetch request.
   * @returns The JSON response.
   */
  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, options)
    if (!response.ok) {
      throw new Error(`Failed to fetch from ${endpoint}: ${response.statusText}`)
    }
    return response.json() as Promise<T>
  }

  /**
   * Fetches the status of all downloads.
   * @returns A promise that resolves to an array of download items.
   */
  public getDownloadsStatus(): Promise<DownloadsAndStatusResponse> {
    return this.fetch<DownloadsAndStatusResponse>('/downloads/status')
  }

  /**
   * Starts a new download.
   * @param username The Soulseek username.
   * @param filePath The path of the file to download.
   * @param size The size of the file.
   * @param metadata Optional metadata for the song.
   * @param id A unique ID for the download.
   * @returns A promise that resolves when the download is started.
   */
  public startDownload(
    username: string,
    filePath: string,
    size: number,
    metadata?: AudioMetadata,
    id?: string
  ): Promise<{ message: string; download_id: string }> {
    return this.fetch('/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        file_path: filePath,
        size,
        metadata,
        id,
      }),
    })
  }

  /**
   * Pauses a download.
   * @param downloadId The unique ID of the download.
   * @returns A promise that resolves when the download is paused.
   */
  public pauseDownloadById(downloadId: string): Promise<{ message: string }> {
    const encodedId = encodeURIComponent(downloadId)
    return this.fetch<{ message: string }>(`/download/pause/${encodedId}`, { method: 'POST' })
  }

  /**
   * Resumes a download.
   * @param downloadId The unique ID of the download.
   * @returns A promise that resolves when the download is resumed.
   */
  public resumeDownloadById(downloadId: string): Promise<{ message: string }> {
    const encodedId = encodeURIComponent(downloadId)
    return this.fetch<{ message: string }>(`/download/resume/${encodedId}`, { method: 'POST' })
  }

  /**
   * Cancels a download.
   * @param username The Soulseek username.
   * @param filePath The path of the file.
   * @returns A promise that resolves when the download is canceled.
   */
  public cancelDownloadById(downloadId: string): Promise<{ message: string }> {
    const encodedId = encodeURIComponent(downloadId)
    return this.fetch<{ message: string }>(`/download/cancel/${encodedId}`, { method: 'POST' })
  }

  /**
   * Fetches metadata for the currently playing song.
   * @returns A promise that resolves with the song metadata.
   */
  public getCurrentSongMetadata(): Promise<Song> {
    return this.fetch('/current-song-metadata')
  }

  /**
   * Romanizes a given text.
   * @param text The text to romanize.
   * @returns A promise that resolves with the romanized text.
   */
  public romanize(text: string): Promise<{ romanized_text: string }> {
    return this.fetch('/romanize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
  }

  /**
   * Fetches lyrics for a given file path from the local cache.
   * @param filePath The path of the song file.
   * @returns A promise that resolves with the lyrics data.
   */
  public getLyrics(filePath: string): Promise<{ lyrics: string; source: string } | { error: string }> {
    const encodedPath = encodeURIComponent(filePath)
    return this.fetch(`/library/lyrics?filePath=${encodedPath}`)
  }

  /**
   * Checks if a cover exists locally.
   * @param fileName The name of the cover file.
   * @returns A promise that resolves with the response.
   */
  public checkLocalCover(fileName: string): Promise<Response> {
    return fetch(`${this.baseUrl}/cover/${fileName}`, { method: 'HEAD' })
  }

  public getCoverUrl(fileName: string): string {
    return `${this.baseUrl}/covers/${fileName}`
  }

  /**
   * Downloads a cover from a URL.
   * @param url The URL of the cover image.
   * @param fileName The desired file name for the saved cover.
   * @returns A promise that resolves with the response.
   */
  public downloadCover(url: string, fileName: string): Promise<{ message: string; file_path: string }> {
    return this.fetch('/download-cover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, fileName }),
    })
  }

  public saveConfig(config: { dataPath: string }): Promise<{ message: string }> {
    return this.fetch('/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
  }

  public getConfig(): Promise<{ dataPath: string }> {
    return this.fetch<{ dataPath: string }>('/config')
  }

  public createPlaylist(name: string, description?: string, thumbnail?: string): Promise<Playlist> {
    return this.fetch('/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, thumbnail }),
    })
  }

  public getPlaylists(): Promise<Playlist[]> {
    return this.fetch<Playlist[]>('/playlists')
  }

  public getPlaylist(playlistId: string): Promise<Playlist> {
    return this.fetch<Playlist>(`/playlists/${playlistId}`)
  }

  public updatePlaylist(playlistId: string, updates: Partial<Playlist>): Promise<Playlist> {
    return this.fetch(`/playlists/${playlistId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
  }

  public deletePlaylist(playlistId: string): Promise<{ message: string }> {
    return this.fetch(`/playlists/${playlistId}`, {
      method: 'DELETE',
    })
  }

  public addSongToPlaylist(playlistId: string, songPath: string): Promise<Playlist> {
    return this.fetch(`/playlists/${playlistId}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ song_path: songPath }),
    })
  }

  public removeSongFromPlaylist(playlistId: string, songPath: string): Promise<Playlist> {
    const encodedPath = encodeURIComponent(songPath)
    return this.fetch(`/playlists/${playlistId}/songs/${encodedPath}`, {
      method: 'DELETE',
    })
  }

  public showInExplorer(filePath: string): Promise<{ message: string }> {
    return this.fetch('/show-in-explorer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    })
  }

  public retryDownload(downloadId: string): Promise<{ message: string }> {
    const encodedId = encodeURIComponent(downloadId)
    return this.fetch(`/download/retry/${encodedId}`, { method: 'POST' })
  }

  public getLibrarySongs(): Promise<Song[]> {
    return this.fetch<Song[]>('/library/songs')
  }

  public refreshSongMetadata(filePath: string): Promise<Song> {
    return this.fetch('/library/songs/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    })
  }

  public generateForensics(filePath: string): Promise<{ message: string; image_path: string }> {
    return this.fetch('/library/songs/generate-forensics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    })
  }

  public search(provider: string, query: string): Promise<any> {
    const encodedQuery = encodeURIComponent(query)
    return this.fetch(`/search?provider=${provider}&q=${encodedQuery}`)
  }

  public startSoulseekSearch(
    query: { query: string; artist?: string; song?: string },
    signal?: AbortSignal
  ): Promise<{ search_token: number; actual_query: string }> {
    return this.fetch('/search/soulseek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
      signal,
    })
  }

  public getSoulseekSearchResults(
    token: number
  ): Promise<{ results: SoulseekFile[]; is_complete: boolean; result_count: number; actual_query: string }> {
    return this.fetch(`/search/soulseek/results/${token}`)
  }
}

export const apiClient = new ApiClient()
