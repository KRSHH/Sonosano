import React, { useState, useEffect, useCallback } from 'react'
import useLocalStorage from '../../hooks/useLocalStorage'
import { useTranslation } from 'react-i18next'
import { Song } from '../../types'
import { usePlaybackManager } from '../../hooks/usePlaybackManager'
import { lyricsService, LyricsData } from '../../services/lyricsService'
import { colorExtractor, ColorPalette } from '../../utils/colorExtraction'
import { sessionCache, SongIdentifier } from '../../utils/sessionCache'
import LyricsDisplay from '../../components/LyricsDisplay/LyricsDisplay'
import { apiClient } from '../../api'
import styles from './LyricsPage.module.css'

interface CurrentSongInfo {
  name: string
  artist: string
  album?: string
  duration?: number
  thumbnail?: string
}

interface LocalLyrics {
  lyrics: string
  source: string
  plain_lyrics?: string
  plain_lyrics_romanized?: string
  synced_lyrics?: string
  synced_lyrics_romanized?: string
}

const LyricsPage: React.FC = () => {
  const { t } = useTranslation()
  const { playbackManager, playbackState } = usePlaybackManager()
  const { isPlaying, currentTime, currentSong } = playbackState

  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null)
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false)
  const [lyricsError, setLyricsError] = useState<string | null>(null)
  const [romanizeLyrics] = useLocalStorage('romanizeLyrics', false)

  const [currentSongInfo, setCurrentSongInfo] = useState<CurrentSongInfo | null>(null)

  const [colorPalette, setColorPalette] = useState<ColorPalette>(() => {
    const defaultPalette = colorExtractor.getDefaultPalette()
    return {
      ...defaultPalette,
      background: '#121212',
    }
  })

  const extractSongMetadata = useCallback(async (song: Song | null): Promise<CurrentSongInfo | null> => {
    if (!song || !song.metadata) return null
    return {
      name: song.metadata.title || song.name,
      artist: song.metadata.artist || 'Unknown Artist',
      album: song.metadata.album,
      duration: song.metadata.duration,
      thumbnail: song.metadata.coverArt,
    }
  }, [])

  const fetchLyricsForSong = useCallback(
    async (songInfo: CurrentSongInfo) => {
      if (!songInfo || !currentSong?.path) {
        return
      }
      const songIdentifier: SongIdentifier = { name: songInfo.name, artist: songInfo.artist, album: songInfo.album }
      const cached = sessionCache.getCachedData(songIdentifier)
      if (cached?.lyrics || cached?.lyricsError) {
        setLyricsData(cached.lyrics)
        setLyricsError(cached.lyricsError)
        setIsLoadingLyrics(cached.isLyricsLoading)
        if (cached.lyrics?.instrumental) setLyricsError(t('lyrics.instrumental'))
        return
      }

      setIsLoadingLyrics(true)
      setLyricsError(null)
      setLyricsData(null)

      try {
        const localLyrics = (await apiClient.getLyrics(currentSong.path)) as LocalLyrics

        const plain =
          romanizeLyrics && localLyrics.plain_lyrics_romanized
            ? localLyrics.plain_lyrics_romanized
            : localLyrics.plain_lyrics
        const rawSynced =
          romanizeLyrics && localLyrics.synced_lyrics_romanized
            ? localLyrics.synced_lyrics_romanized
            : localLyrics.synced_lyrics

        const formattedLyrics: LyricsData = {
          id: 0,
          trackName: songInfo.name,
          artistName: songInfo.artist,
          albumName: songInfo.album || '',
          duration: songInfo.duration || 0,
          instrumental: false,
          plainLyrics: plain || '',
          syncedLyrics: lyricsService.parseSyncedLyrics(rawSynced || ''),
          rawSyncedLyrics: rawSynced || '',
        }
        setLyricsData(formattedLyrics)
        sessionCache.updateLyrics(songIdentifier, formattedLyrics)
        setIsLoadingLyrics(false)
        return
      } catch (error) {
        // This can be ignored, as we'll try fetching from the network next
        console.error('Failed to fetch local lyrics:', error)
      }

      try {
        if (!songInfo.name || !songInfo.artist) throw new Error('Song name and artist are required')

        let lyrics = await lyricsService.fetchLyrics(
          songInfo.name.trim(),
          songInfo.artist.trim(),
          songInfo.album?.trim(),
          songInfo.duration
        )
        if (!lyrics) lyrics = await lyricsService.fetchCachedLyrics(songInfo.name.trim(), songInfo.artist.trim())

        if (lyrics) {
          setLyricsData(lyrics)
          sessionCache.updateLyrics(songIdentifier, lyrics)
          if (lyrics.instrumental) setLyricsError(t('lyrics.instrumental'))
        } else {
          setLyricsError(t('lyrics.noLyrics'))
          sessionCache.updateLyrics(songIdentifier, null, t('lyrics.noLyrics'))
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
        setLyricsError(errorMessage)
        sessionCache.updateLyrics(songIdentifier, null, errorMessage)
      } finally {
        setIsLoadingLyrics(false)
      }
    },
    [currentSong, romanizeLyrics, t]
  )

  const extractColorsFromCover = useCallback(async (songInfo?: CurrentSongInfo) => {
    if (!songInfo) {
      setColorPalette(colorExtractor.getDefaultPalette())
      return
    }
    const songIdentifier: SongIdentifier = { name: songInfo.name, artist: songInfo.artist, album: songInfo.album }
    const cached = sessionCache.getCachedData(songIdentifier)
    if (cached?.colorPalette) {
      setColorPalette({
        ...cached.colorPalette,
        background: cached.colorPalette.background === '#000000' ? '#121212' : cached.colorPalette.background,
      })
      return
    }
    const thumbnailUrl = songInfo.thumbnail
    if (!thumbnailUrl) {
      const defaultPalette = colorExtractor.getDefaultPalette()
      setColorPalette(defaultPalette)
      sessionCache.updateColorPalette(songIdentifier, defaultPalette)
      return
    }
    try {
      const fileName = thumbnailUrl.split('/').pop() || ''
      const fullUrl = apiClient.getCoverUrl(fileName)
      const palette = await colorExtractor.extractColorsFromImage(fullUrl, songIdentifier)
      setColorPalette(palette)
      sessionCache.updateColorPalette(songIdentifier, palette)
    } catch {
      const defaultPalette = colorExtractor.getDefaultPalette()
      setColorPalette(defaultPalette)
      sessionCache.updateColorPalette(songIdentifier, defaultPalette)
    }
  }, [])

  useEffect(() => {
    const loadSongData = async () => {
      const songInfo = await extractSongMetadata(currentSong)
      setCurrentSongInfo(songInfo)
      if (songInfo) {
        fetchLyricsForSong(songInfo)
        extractColorsFromCover(songInfo)
      }
    }
    loadSongData()
  }, [currentSong, fetchLyricsForSong, extractColorsFromCover, extractSongMetadata])

  const handleSeek = useCallback(
    (time: number) => {
      playbackManager.seek(time)
    },
    [playbackManager]
  )

  if (isLoadingLyrics)
    return (
      <div className={styles.lyricsPage} style={{ backgroundColor: colorPalette.background }}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} style={{ borderTopColor: colorPalette.accent }} />
          <p style={{ color: colorPalette.text }}>{t('lyrics.loading')}</p>
        </div>
      </div>
    )

  if (!currentSongInfo)
    return (
      <div className={styles.lyricsPage} style={{ backgroundColor: colorPalette.background }}>
        <div className={styles.noSongContainer}>
          <div className={styles.noSongIcon} style={{ color: colorPalette.textSecondary }}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <h2 style={{ color: colorPalette.text }}>{t('lyrics.noSongTitle')}</h2>
          <p style={{ color: colorPalette.textSecondary }}>{t('lyrics.noSongDescription')}</p>
        </div>
      </div>
    )

  return (
    <div className={styles.lyricsPage} style={{ backgroundColor: colorPalette.background }}>
      <div className={styles.lyricsContainer}>
        {lyricsError ? (
          <div className={styles.errorContainer}>
            <h3 style={{ color: colorPalette.text }}>{t('lyrics.errorTitle')}</h3>
            <p style={{ color: colorPalette.textSecondary }}>{lyricsError}</p>
            <button
              onClick={() => fetchLyricsForSong(currentSongInfo!)}
              className={styles.retryButton}
              style={{ backgroundColor: colorPalette.accent, color: colorPalette.text }}
              disabled={isLoadingLyrics}
            >
              {isLoadingLyrics ? t('lyrics.loading') : t('common.retry')}
            </button>
          </div>
        ) : (
          <LyricsDisplay
            lyrics={lyricsData?.syncedLyrics || []}
            plainLyrics={lyricsData?.plainLyrics || ''}
            currentTime={currentTime}
            isPlaying={isPlaying}
            colorPalette={colorPalette}
            onSeek={handleSeek}
          />
        )}
      </div>
    </div>
  )
}

export default LyricsPage
