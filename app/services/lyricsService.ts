interface LyricsResponse {
  id: number
  trackName: string
  artistName: string
  albumName: string
  duration: number
  instrumental: boolean
  plainLyrics: string
  syncedLyrics: string
}

export interface ParsedLyric {
  time: number // Time in seconds
  text: string
}

export interface LyricsData {
  id: number
  trackName: string
  artistName: string
  albumName: string
  duration: number
  instrumental: boolean
  plainLyrics: string
  syncedLyrics: ParsedLyric[]
  rawSyncedLyrics: string
  plainLyricsRomanized?: string
  rawSyncedLyricsRomanized?: string
}

import { apiClient } from '../api'

class LyricsService {
  private baseUrl = 'https://lrclib.net/api'

  /**
   * Romanize lyrics if the setting is enabled
   */
  private async romanizeLyrics(lyricsData: LyricsData): Promise<LyricsData> {
    const shouldRomanize = localStorage.getItem('romanizeLyrics') === 'true'
    if (!shouldRomanize) {
      return lyricsData
    }

    try {
      const romanizedResult = await apiClient.romanize(lyricsData.plainLyrics)
      const romanizedPlainLyrics = romanizedResult.romanized_text

      // Also romanize synced lyrics line by line
      const romanizedSyncedLyrics = await Promise.all(
        lyricsData.syncedLyrics.map(async (line) => {
          try {
            const romanizedLineResult = await apiClient.romanize(line.text)
            return {
              ...line,
              text: romanizedLineResult.romanized_text,
            }
          } catch {
            return line // Return original line on error
          }
        })
      )

      return {
        ...lyricsData,
        plainLyrics: romanizedPlainLyrics,
        syncedLyrics: romanizedSyncedLyrics,
      }
    } catch (error) {
      console.error('Error during romanization:', error)
      return lyricsData
    }
  }

  /**
   * Parse synced lyrics from LRC format to time-based array
   */
  public parseSyncedLyrics(syncedLyricsString: string): ParsedLyric[] {
    if (!syncedLyricsString) return []

    const lines = syncedLyricsString.split('\n')
    const parsedLyrics: ParsedLyric[] = []

    for (const line of lines) {
      // Match LRC timestamp format [mm:ss.xx] or [mm:ss]
      const match = line.match(/^\[(\d{2}):(\d{2})(?:\.(\d{2}))?\]\s*(.*)$/)
      if (match) {
        const minutes = parseInt(match[1], 10)
        const seconds = parseInt(match[2], 10)
        const centiseconds = parseInt(match[3] || '0', 10)
        const text = match[4].trim()

        // Convert to total seconds
        const timeInSeconds = minutes * 60 + seconds + centiseconds / 100

        if (text) {
          // Only add non-empty lyrics
          parsedLyrics.push({
            time: timeInSeconds,
            text: text,
          })
        }
      }
    }

    // Sort by time to ensure proper order
    return parsedLyrics.sort((a, b) => a.time - b.time)
  }

  /**
   * Fetch lyrics from LRCLIB API
   */
  async fetchLyrics(
    trackName: string,
    artistName: string,
    albumName: string = '',
    duration?: number
  ): Promise<LyricsData | null> {
    try {
      // Build query parameters
      const params = new URLSearchParams({
        track_name: trackName.trim(),
        artist_name: artistName.trim(),
      })

      if (albumName.trim()) {
        params.append('album_name', albumName.trim())
      }

      if (duration && duration > 0) {
        params.append('duration', Math.round(duration).toString())
      }

      console.warn('Fetching lyrics for:', { trackName, artistName, albumName, duration })

      // Try the main API first (with external sources)
      const url = `${this.baseUrl}/get?${params.toString()}`
      console.warn('LRCLIB API URL:', url)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Sonosano v1.0.0 (https://github.com/KRSHH/Sonosano)',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.warn('Lyrics not found for track:', trackName)
          return null
        }
        throw new Error(`LRCLIB API error: ${response.status} ${response.statusText}`)
      }

      const data: LyricsResponse = await response.json()
      console.warn('Received lyrics data:', data)

      // Parse synced lyrics
      const syncedLyrics = this.parseSyncedLyrics(data.syncedLyrics)

      const lyrics: LyricsData = {
        id: data.id,
        trackName: data.trackName,
        artistName: data.artistName,
        albumName: data.albumName,
        duration: data.duration,
        instrumental: data.instrumental,
        plainLyrics: data.plainLyrics,
        syncedLyrics: syncedLyrics,
        rawSyncedLyrics: data.syncedLyrics,
      }

      return this.romanizeLyrics(lyrics)
    } catch (error) {
      console.error('Error fetching lyrics:', error)
      return null
    }
  }

  /**
   * Fetch lyrics from cache only (faster, no external sources)
   */
  async fetchCachedLyrics(
    trackName: string,
    artistName: string,
    albumName: string = '',
    duration?: number
  ): Promise<LyricsData | null> {
    try {
      const params = new URLSearchParams({
        track_name: trackName.trim(),
        artist_name: artistName.trim(),
      })

      if (albumName.trim()) {
        params.append('album_name', albumName.trim())
      }

      if (duration && duration > 0) {
        params.append('duration', Math.round(duration).toString())
      }

      const url = `${this.baseUrl}/get-cached?${params.toString()}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Sonosano v1.0.0 (https://github.com/KRSHH/Sonosano)',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`LRCLIB API error: ${response.status} ${response.statusText}`)
      }

      const data: LyricsResponse = await response.json()
      const syncedLyrics = this.parseSyncedLyrics(data.syncedLyrics)

      const lyrics: LyricsData = {
        id: data.id,
        trackName: data.trackName,
        artistName: data.artistName,
        albumName: data.albumName,
        duration: data.duration,
        instrumental: data.instrumental,
        plainLyrics: data.plainLyrics,
        syncedLyrics: syncedLyrics,
        rawSyncedLyrics: data.syncedLyrics,
      }

      return this.romanizeLyrics(lyrics)
    } catch (error) {
      console.error('Error fetching cached lyrics:', error)
      return null
    }
  }

  /**
   * Search for lyrics using keywords
   */
  async searchLyrics(query: string, trackName?: string, artistName?: string): Promise<LyricsData[]> {
    try {
      const params = new URLSearchParams()

      if (query.trim()) {
        params.append('q', query.trim())
      }

      if (trackName?.trim()) {
        params.append('track_name', trackName.trim())
      }

      if (artistName?.trim()) {
        params.append('artist_name', artistName.trim())
      }

      if (!params.toString()) {
        return []
      }

      const url = `${this.baseUrl}/search?${params.toString()}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Sonosano v1.0.0 (https://github.com/KRSHH/Sonosano)',
        },
      })

      if (!response.ok) {
        throw new Error(`LRCLIB API error: ${response.status} ${response.statusText}`)
      }

      const data: LyricsResponse[] = await response.json()

      return data.map((item) => ({
        id: item.id,
        trackName: item.trackName,
        artistName: item.artistName,
        albumName: item.albumName,
        duration: item.duration,
        instrumental: item.instrumental,
        plainLyrics: item.plainLyrics,
        syncedLyrics: this.parseSyncedLyrics(item.syncedLyrics),
        rawSyncedLyrics: item.syncedLyrics,
      }))
    } catch (error) {
      console.error('Error searching lyrics:', error)
      return []
    }
  }

  /**
   * Get the current lyric line based on playback time
   */
  getCurrentLyricIndex(syncedLyrics: ParsedLyric[], currentTime: number): number {
    if (syncedLyrics.length === 0) return -1

    // Find the last lyric line that should be playing at currentTime
    let currentIndex = -1
    for (let i = 0; i < syncedLyrics.length; i++) {
      if (syncedLyrics[i].time <= currentTime) {
        currentIndex = i
      } else {
        break
      }
    }

    return currentIndex
  }

  /**
   * Get the next lyric line time for preloading/animation
   */
  getNextLyricTime(syncedLyrics: ParsedLyric[], currentIndex: number): number | null {
    if (currentIndex >= 0 && currentIndex < syncedLyrics.length - 1) {
      return syncedLyrics[currentIndex + 1].time
    }
    return null
  }
}

export const lyricsService = new LyricsService()
export default LyricsService
