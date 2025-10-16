import { apiClient } from '../api'
import { sessionCache, SongIdentifier } from '../utils/sessionCache'
import { lyricsService } from './lyricsService'
import { colorExtractor } from '../utils/colorExtraction'
import { PlaybackManager, PlaybackState, Song } from '../lib/managers/PlaybackManager'

class SongDataService {
  private isInitialized = false
  private currentSong: SongIdentifier | null = null
  private playbackManager: PlaybackManager

  constructor() {
    this.playbackManager = PlaybackManager.getInstance()
  }

  initialize(): void {
    if (this.isInitialized) return

    console.warn('SongDataService: Initializing background data fetching...')

    this.playbackManager.subscribe(this.handlePlaybackStateChanged)

    this.isInitialized = true
  }

  private handlePlaybackStateChanged = async (state: PlaybackState) => {
    const { isPlaying, currentSong } = state

    if (isPlaying && currentSong) {
      const songInfo = await this.extractSongMetadata(currentSong)
      if (songInfo && (songInfo.name !== this.currentSong?.name || songInfo.artist !== this.currentSong?.artist)) {
        this.currentSong = songInfo

        this.fetchSongDataInBackground(songInfo)
      }
    }
  }

  private async extractSongMetadata(song: Song): Promise<SongIdentifier | null> {
    try {
      let songInfo: SongIdentifier | null = null

      if (song.metadata) {
        songInfo = {
          name: song.metadata.title || song.name || 'Unknown',
          artist: song.metadata.artist || 'Unknown Artist',
          album: song.metadata.album,
        }
      } else if (song.name) {
        const parts = song.name.split(' - ')
        if (parts.length >= 2) {
          songInfo = {
            name: parts.slice(1).join(' - ').trim(),
            artist: parts[0].trim(),
          }
        } else {
          songInfo = {
            name: song.name,
            artist: 'Unknown Artist',
          }
        }
      }

      return songInfo
    } catch (error) {
      console.error('SongDataService: Error extracting song metadata:', error)
      return null
    }
  }

  private async fetchSongDataInBackground(songInfo: SongIdentifier): Promise<void> {
    console.warn('SongDataService: Starting background fetch for:', songInfo)

    const cached = sessionCache.getCachedData(songInfo)

    if (!cached?.lyrics && !cached?.isLyricsLoading) {
      this.fetchLyricsInBackground(songInfo)
    }

    if (!cached?.colorPalette && !cached?.isColorLoading) {
      this.fetchColorPaletteInBackground(songInfo)
    }
  }

  private async fetchLyricsInBackground(songInfo: SongIdentifier): Promise<void> {
    try {
      console.warn('SongDataService: Fetching lyrics for:', songInfo.name, 'by', songInfo.artist)
      sessionCache.setLyricsLoading(songInfo, true)

      if (!songInfo.name || !songInfo.artist) {
        sessionCache.updateLyrics(songInfo, null, 'Invalid song information')
        return
      }

      const currentSong = this.playbackManager.getState().currentSong
      if (currentSong?.path) {
        try {
          const localLyrics = await apiClient.getLyrics(currentSong.path)
          const shouldRomanize = localStorage.getItem('romanizeLyrics') === 'true'
          const plain =
            shouldRomanize && localLyrics.plain_lyrics_romanized
              ? localLyrics.plain_lyrics_romanized
              : localLyrics.plain_lyrics
          const rawSynced =
            shouldRomanize && localLyrics.synced_lyrics_romanized
              ? localLyrics.synced_lyrics_romanized
              : localLyrics.synced_lyrics

          const formattedLyrics = {
            ...localLyrics,
            plainLyrics: plain,
            syncedLyrics: lyricsService.parseSyncedLyrics(rawSynced || ''),
            rawSyncedLyrics: rawSynced,
          }
          sessionCache.updateLyrics(songInfo, formattedLyrics)
          console.warn('SongDataService: Lyrics loaded from local cache for:', songInfo.name)
          return
        } catch {
          console.warn('SongDataService: Lyrics not in local cache, fetching from lrclib.net')
        }
      }

      let lyrics = await lyricsService.fetchLyrics(
        songInfo.name.trim(),
        songInfo.artist.trim(),
        songInfo.album?.trim() || ''
      )

      if (!lyrics) {
        lyrics = await lyricsService.fetchCachedLyrics(songInfo.name.trim(), songInfo.artist.trim())
      }

      if (lyrics) {
        sessionCache.updateLyrics(songInfo, lyrics)
        console.warn('SongDataService: Lyrics cached successfully for:', songInfo.name)
      } else {
        sessionCache.updateLyrics(songInfo, null, 'No lyrics available for this song')
        console.warn('SongDataService: No lyrics found for:', songInfo.name)
      }
    } catch (error) {
      console.error('SongDataService: Error fetching lyrics:', error)
      const errorMessage =
        error instanceof Error ? 'Failed to load lyrics - please try again' : 'An unexpected error occurred'
      sessionCache.updateLyrics(songInfo, null, errorMessage)
    } finally {
      sessionCache.setLyricsLoading(songInfo, false)
    }
  }

  private async fetchColorPaletteInBackground(songInfo: SongIdentifier): Promise<void> {
    try {
      sessionCache.setColorLoading(songInfo, true)

      const thumbnailUrl = this.playbackManager.getState().currentSong?.metadata?.coverArt

      if (thumbnailUrl && thumbnailUrl.trim() !== '') {
        const fileName = thumbnailUrl.split('/').pop() || ''
        const fullUrl = apiClient.getCoverUrl(fileName)
        const colorPalette = await colorExtractor.extractColorsFromImage(fullUrl, songInfo)
        sessionCache.updateColorPalette(songInfo, colorPalette)
      } else {
        sessionCache.updateColorPalette(songInfo, colorExtractor.getDefaultPalette())
      }
    } catch (error) {
      console.error('SongDataService: Error fetching color palette:', error)
      sessionCache.updateColorPalette(songInfo, colorExtractor.getDefaultPalette())
    } finally {
      sessionCache.setColorLoading(songInfo, false)
    }
  }

  getCachedSongData(songInfo: SongIdentifier) {
    return sessionCache.getCachedData(songInfo)
  }

  getCurrentSong(): SongIdentifier | null {
    return this.currentSong
  }

  clearCache(): void {
    sessionCache.clearAll()
  }

  clearExpired(): void {
    sessionCache.clearExpired()
  }

  getCacheStats() {
    return {
      size: sessionCache.getSize(),
      keys: sessionCache.getCachedKeys(),
    }
  }
}

export const songDataService = new SongDataService()
