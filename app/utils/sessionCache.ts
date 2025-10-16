import { LyricsData } from '../services/lyricsService'
import { ColorPalette } from '../utils/colorExtraction'

interface CachedSongData {
  lyrics: LyricsData | null
  colorPalette: ColorPalette | null
  isLyricsLoading: boolean
  isColorLoading: boolean
  lyricsError: string | null
  timestamp: number
}

interface SongIdentifier {
  name: string
  artist: string
  album?: string
}

class SessionCache {
  private cache: Map<string, CachedSongData> = new Map()
  private readonly CACHE_EXPIRY = 1000 * 60 * 60 * 2

  private generateKey(songInfo: SongIdentifier): string {
    return `${songInfo.artist?.toLowerCase() || 'unknown'}-${songInfo.name?.toLowerCase() || 'unknown'}-${songInfo.album?.toLowerCase() || ''}`
  }

  private isValid(data: CachedSongData): boolean {
    return Date.now() - data.timestamp < this.CACHE_EXPIRY
  }

  getCachedData(songInfo: SongIdentifier): CachedSongData | null {
    const key = this.generateKey(songInfo)
    const cached = this.cache.get(key)

    if (cached && this.isValid(cached)) {
      return cached
    }

    if (cached) {
      this.cache.delete(key)
    }

    return null
  }

  initializeCacheEntry(songInfo: SongIdentifier): CachedSongData {
    const key = this.generateKey(songInfo)
    const initialData: CachedSongData = {
      lyrics: null,
      colorPalette: null,
      isLyricsLoading: false,
      isColorLoading: false,
      lyricsError: null,
      timestamp: Date.now(),
    }

    this.cache.set(key, initialData)
    return initialData
  }

  updateLyrics(songInfo: SongIdentifier, lyrics: LyricsData | null, error: string | null = null): void {
    const key = this.generateKey(songInfo)
    const existing = this.cache.get(key) || this.initializeCacheEntry(songInfo)

    existing.lyrics = lyrics
    existing.lyricsError = error
    existing.isLyricsLoading = false
    existing.timestamp = Date.now()

    this.cache.set(key, existing)
  }

  updateColorPalette(songInfo: SongIdentifier, colorPalette: ColorPalette): void {
    const key = this.generateKey(songInfo)
    const existing = this.cache.get(key) || this.initializeCacheEntry(songInfo)

    existing.colorPalette = colorPalette
    existing.isColorLoading = false
    existing.timestamp = Date.now()

    this.cache.set(key, existing)
  }

  setLyricsLoading(songInfo: SongIdentifier, loading: boolean): void {
    const key = this.generateKey(songInfo)
    const existing = this.cache.get(key) || this.initializeCacheEntry(songInfo)

    existing.isLyricsLoading = loading
    this.cache.set(key, existing)
  }

  setColorLoading(songInfo: SongIdentifier, loading: boolean): void {
    const key = this.generateKey(songInfo)
    const existing = this.cache.get(key) || this.initializeCacheEntry(songInfo)

    existing.isColorLoading = loading
    this.cache.set(key, existing)
  }

  clearExpired(): void {
    const now = Date.now()
    for (const [key, data] of this.cache.entries()) {
      if (now - data.timestamp > this.CACHE_EXPIRY) {
        this.cache.delete(key)
      }
    }
  }

  clearAll(): void {
    this.cache.clear()
  }

  getSize(): number {
    return this.cache.size
  }

  getCachedKeys(): string[] {
    return Array.from(this.cache.keys())
  }
}

export const sessionCache = new SessionCache()
export type { SongIdentifier, CachedSongData }
