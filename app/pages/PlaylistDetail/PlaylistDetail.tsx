import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Modal, Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import styles from './playlistDetail.module.css'
import { apiClient } from '../../api'
import { colorExtractor } from '../../utils/colorExtraction'
import { usePlaybackManager } from '../../hooks/usePlaybackManager'
import { formatDuration } from '../../utils/format'
import { Playlist, Song } from '../../types'
import { useLibrarySongs } from '../../hooks/useLibrarySongs'
import { usePlaylistPlayback } from '../../hooks/usePlaylistPlayback'
import { DEFAULT_PLAYLIST_THUMBNAIL } from '../../utils/constants'
import playingNowBar from '../../../assets/imgs/playingnowbar.gif'
import { sessionCache } from '../../utils/sessionCache'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface PlaylistDetailProps {}

const addSongsModalStyle = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: 1200,
  height: '80vh',
  bgcolor: '#181818',
  border: '1px solid #282828',
  borderRadius: '12px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
  p: 0,
  color: '#fff',
  outline: 'none',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

export default function PlaylistDetail(_props: PlaylistDetailProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()

  const { playbackManager, playbackState } = usePlaybackManager()

  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const { data: libraryFiles = [] } = useLibrarySongs()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)

  const [addSongsModalOpen, setAddSongsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [recentlyAddedSongs, setRecentlyAddedSongs] = useState<Set<string>>(new Set())

  const [hasAutoOpened] = useState(false)

  const getAvailableSongs = (): Song[] => {
    if (!searchQuery) return libraryFiles

    const query = searchQuery.toLowerCase()
    return libraryFiles.filter(
      (file) =>
        file.name.toLowerCase().includes(query) ||
        (file.metadata?.title && file.metadata.title.toLowerCase().includes(query)) ||
        (file.metadata?.artist && file.metadata.artist.toLowerCase().includes(query)) ||
        (file.metadata?.album && file.metadata.album.toLowerCase().includes(query))
    )
  }

  const { isCurrentPlaylist, isPlaying, currentlyPlayingFile, playlistSongs } = usePlaylistPlayback(playlist)

  const updateBackgroundGradient = async (thumbnailUrl: string, songInfo: any) => {
    try {
      const palette = await colorExtractor.extractColorsFromImage(thumbnailUrl, songInfo)
      const dominantColor = palette.background

      const headerGradient = `linear-gradient(180deg, ${dominantColor} 0%, rgba(18, 18, 18, 0.8) 100%)`

      if (containerRef.current) {
        containerRef.current.style.setProperty('--header-gradient', headerGradient)
      }
    } catch (error) {
      console.error('Failed to update background gradient:', error)

      const defaultGradient =
        'linear-gradient(180deg, rgba(94, 49, 9, 0.8) 0%, rgba(47, 24, 4, 0.4) 70%, rgba(18, 18, 18, 0.8) 100%)'

      if (containerRef.current) {
        containerRef.current.style.setProperty('--header-gradient', defaultGradient)
      }
    }
  }

  const loadPlaylist = React.useCallback(async () => {
    if (!id) {
      setError('No playlist ID provided')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const playlistData = await apiClient.getPlaylist(id)
      if (!playlistData) {
        setError('Playlist not found')
        setLoading(false)
        return
      }

      setPlaylist(playlistData)

      const songInfo = { name: playlistData.name, artist: '' }
      const cachedData = sessionCache.getCachedData(songInfo)

      if (cachedData && cachedData.colorPalette) {
        const dominantColor = cachedData.colorPalette.background
        const headerGradient = `linear-gradient(180deg, ${dominantColor} 0%, rgba(18, 18, 18, 0.8) 100%)`
        if (containerRef.current) {
          containerRef.current.style.setProperty('--header-gradient', headerGradient)
        }
      } else if (playlistData.thumbnail) {
        await updateBackgroundGradient(apiClient.getCoverUrl(playlistData.thumbnail), songInfo)
      }
    } catch {
      setError('Failed to load playlist')
    } finally {
      setLoading(false)
    }
  }, [id])

  const isSongInPlaylist = (song: Song): boolean => {
    if (!playlist) return false
    return playlist.songs.includes(song.path) || recentlyAddedSongs.has(song.id)
  }

  const handleToggleSong = async (song: Song) => {
    if (!playlist) return

    const isInPlaylist = isSongInPlaylist(song)

    // Optimistic UI update
    const updatedRecentlyAddedSongs = new Set(recentlyAddedSongs)
    if (isInPlaylist) {
      updatedRecentlyAddedSongs.delete(song.id)
    } else {
      updatedRecentlyAddedSongs.add(song.id)
    }
    setRecentlyAddedSongs(updatedRecentlyAddedSongs)

    // We still update the main playlist object for other parts of the UI
    const updatedPlaylist = { ...playlist }
    if (isInPlaylist) {
      updatedPlaylist.songs = updatedPlaylist.songs.filter((songPath) => songPath !== song.path)
    } else {
      updatedPlaylist.songs = [...updatedPlaylist.songs, song.path]
    }
    setPlaylist(updatedPlaylist as Playlist)

    try {
      if (isInPlaylist) {
        await apiClient.removeSongFromPlaylist(playlist.id, song.path)
      } else {
        await apiClient.addSongToPlaylist(playlist.id, song.path)
      }
    } catch {
      setError(`Failed to ${isInPlaylist ? 'remove' : 'add'} song`)
      // If the API call fails, revert the optimistic update
      loadPlaylist()
      // Also revert the recently added songs set
      setRecentlyAddedSongs(new Set(recentlyAddedSongs))
    }
  }

  const handleRemoveSong = async (song: Song) => {
    if (!playlist) return

    try {
      const updatedPlaylist = await apiClient.removeSongFromPlaylist(playlist.id, song.path)
      setPlaylist(updatedPlaylist)
    } catch {
      setError('Failed to remove song from playlist')
    }
  }

  const handlePlayPause = (file: Song) => {
    if (!playlist) return

    if (currentlyPlayingFile?.id === file.id && isCurrentPlaylist) {
      if (isPlaying) {
        playbackManager.pause()
      } else {
        playbackManager.resume()
      }
    } else {
      const songIndex = playlistSongs.findIndex((song) => song.id === file.id)
      if (songIndex !== -1) {
        playbackManager.playSong(file, playlistSongs, songIndex)
      }
    }
  }

  const handlePlaylistToggle = () => {
    if (!playlist || playlistSongs.length === 0) return

    if (isCurrentPlaylist) {
      if (isPlaying) {
        playbackManager.pause()
      } else {
        playbackManager.resume()
      }
    } else {
      playbackManager.playPlaylist(playlistSongs, 0)
    }
  }

  useEffect(() => {
    loadPlaylist()
  }, [id, loadPlaylist])

  useEffect(() => {}, [playlist, location.search, hasAutoOpened])

  useEffect(() => {
    if (playlist && playlistSongs.length > 0 && isCurrentPlaylist) {
      const globalSongs = playbackState.currentPlaylistSongs
      const currentSongs = playlistSongs.map((song) => ({
        name: song.name,
        artistName: song.metadata?.artist || 'Unknown Artist',
        streams: 0,
        secondsDuration: song.metadata?.duration || 0,
      }))

      if (JSON.stringify(globalSongs) !== JSON.stringify(currentSongs)) {
        // console.log('Playlist has changed, updating global state')
      }
    }
  }, [playlist, playlistSongs, isCurrentPlaylist, playbackManager, playbackState.currentPlaylistSongs])

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading playlist...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <i className="fa-solid fa-exclamation-triangle"></i>
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={() => navigate('/playlists')} className={styles.backButton}>
          Back to Playlists
        </button>
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className={styles.errorContainer}>
        <i className="fa-solid fa-music"></i>
        <h3>Playlist Not Found</h3>
        <p>The playlist you're looking for doesn't exist.</p>
        <button onClick={() => navigate('/playlists')} className={styles.backButton}>
          Back to Playlists
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={styles.playlistDetailContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.playlistInfo}>
          <div className={styles.thumbnail}>
            {playlist.thumbnail ? (
              <img
                src={apiClient.getCoverUrl(playlist.thumbnail)}
                alt="Playlist thumbnail"
                onLoad={() => {
                  if (playlist?.thumbnail) {
                    updateBackgroundGradient(apiClient.getCoverUrl(playlist.thumbnail), {
                      name: playlist.name,
                      artist: '',
                    })
                  }
                }}
                onError={({ currentTarget }) => {
                  currentTarget.onerror = null
                  currentTarget.src = DEFAULT_PLAYLIST_THUMBNAIL
                  updateBackgroundGradient(DEFAULT_PLAYLIST_THUMBNAIL, {
                    name: playlist.name,
                    artist: '',
                  })
                }}
              />
            ) : (
              <div className={styles.placeholderThumbnail}>
                <i className="fa-solid fa-music"></i>
              </div>
            )}
          </div>
          <div className={styles.info}>
            <span className={styles.type}>{t('playlistDetail.type')}</span>
            <h1>{playlist.name}</h1>
            {playlist.description && <p className={styles.description}>{playlist.description}</p>}
            <div className={styles.stats}>
              <span>{playlistSongs.length} songs</span>
              <span>{t('playlistDetail.created', { date: new Date(playlist.createdAt).toLocaleDateString() })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Player Controls */}
      <div className={styles.playerControls}>
        <button className={styles.playButton} onClick={handlePlaylistToggle}>
          <i className={`fa-solid fa-${isCurrentPlaylist && isPlaying ? 'pause' : 'play'}`}></i>
        </button>

        <div className={styles.actionButtons}>
          <button
            className={styles.actionButton}
            title={t('playlistDetail.addSongsTitle')}
            onClick={() => setAddSongsModalOpen(true)}
          >
            <i className="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>

      {/* Songs List */}
      <div className={styles.songsContainer}>
        <div className={styles.songsHeader}>
          <span>#</span>
          <span>{t('playlistDetail.headerTitle')}</span>
          <span>{t('playlistDetail.headerAlbum')}</span>
          <span>{t('playlistDetail.headerQuality')}</span>
          <span>
            <i className="fa-regular fa-clock"></i>
          </span>
        </div>

        {playlistSongs.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="fa-solid fa-music"></i>
            <h3>{t('playlistDetail.emptyTitle')}</h3>
            <p>{t('playlistDetail.emptyDescription')}</p>
            <button onClick={() => setAddSongsModalOpen(true)} className={styles.addButton}>
              <i className="fa-solid fa-plus"></i>
              {t('playlistDetail.addSongs')}
            </button>
          </div>
        ) : (
          <div className={styles.songsList}>
            {playlistSongs.map((song, index) => (
              <div
                key={song.id}
                className={`${styles.songRow} ${currentlyPlayingFile?.id === song.id ? styles.playing : ''}`}
              >
                <div className={styles.numberCol}>
                  {currentlyPlayingFile?.id === song.id && isPlaying ? (
                    <div className={styles.playingIndicator}>
                      <img src={playingNowBar} alt="Playing" />
                      <button onClick={() => handlePlayPause(song)} className={styles.pauseOnHover}>
                        <i className="fa-solid fa-pause"></i>
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className={styles.trackNumber}>{index + 1}</span>
                      <div className={styles.playIconCol}>
                        <button onClick={() => handlePlayPause(song)}>
                          <i className="fa-solid fa-play"></i>
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <div className={styles.titleCol}>
                  <div className={styles.trackImageContainer}>
                    {song.metadata?.coverArt ? (
                      <img src={song.metadata.coverArt} alt="Track" className={styles.trackImage} />
                    ) : (
                      <div className={styles.placeholderTrackImage}>
                        <i className="fa-solid fa-music"></i>
                      </div>
                    )}
                  </div>
                  <div className={styles.songInfo}>
                    <div className={styles.songTitle}>{song.metadata?.title || song.name}</div>
                    <div className={styles.songArtist}>{song.metadata?.artist || 'Unknown Artist'}</div>
                  </div>
                </div>
                <div className={styles.albumCol}>{song.metadata?.album || 'Unknown Album'}</div>
                <div className={styles.qualityCol}>
                  {song.metadata?.display_quality && (
                    <span className={styles.quality}>{song.metadata.display_quality}</span>
                  )}
                </div>
                <div className={styles.durationCol}>
                  <span className={styles.duration}>{formatDuration(song.metadata?.duration)}</span>
                  <button
                    onClick={() => handleRemoveSong(song)}
                    className={styles.removeButton}
                    title={t('playlistDetail.removeFromPlaylist')}
                  >
                    <i className="fa-solid fa-x"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Songs Modal */}
      <Modal
        open={addSongsModalOpen}
        onClose={() => {
          setAddSongsModalOpen(false)
          setSearchQuery('')
          setRecentlyAddedSongs(new Set())
        }}
        aria-labelledby="add-songs-modal"
      >
        <Box sx={addSongsModalStyle}>
          {/* Modal Header */}
          <div className={styles.addSongsHeader}>
            <div className={styles.headerLeft}>
              <h2>{t('playlistDetail.addSongsModalTitle', { playlistName: playlist?.name })}</h2>
            </div>
            <div className={styles.headerRight}>
              <div className={styles.searchBar}>
                <i className="fa-solid fa-search"></i>
                <input
                  type="text"
                  placeholder={t('playlistDetail.searchSongsPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                onClick={() => {
                  setAddSongsModalOpen(false)
                  setSearchQuery('')
                  setRecentlyAddedSongs(new Set())
                }}
                className={styles.closeModalButton}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
          </div>

          {/* Songs Grid */}
          <div className={styles.addSongsContent}>
            {libraryFiles.length === 0 ? (
              <div className={styles.noSongsAvailable}>
                <i className="fa-solid fa-music"></i>
                <h3>{t('playlistDetail.noSongsInLibrary')}</h3>
                <p>{t('playlistDetail.noSongsInLibraryDescription')}</p>
              </div>
            ) : (
              <div className={styles.songsGrid}>
                {getAvailableSongs().map((song) => {
                  const isInPlaylist = isSongInPlaylist(song)
                  return (
                    <div
                      key={song.id}
                      className={`${styles.songCard} ${isInPlaylist ? styles.inPlaylist : ''}`}
                      onClick={() => handleToggleSong(song)}
                    >
                      {/* In Playlist Indicator */}
                      <div className={`${styles.playlistIndicator} ${isInPlaylist ? styles.active : ''}`}>
                        <i className="fa-solid fa-check"></i>
                      </div>

                      {/* Album Art */}
                      <div className={styles.albumArt}>
                        {song.metadata?.coverArt ? (
                          <>
                            <img
                              src={song.metadata.coverArt}
                              alt={song.metadata.title || song.name}
                              onError={(e) => {
                                const target = e.currentTarget
                                target.style.display = 'none'
                                const placeholder = target.parentElement?.querySelector('.placeholder')
                                if (placeholder) {
                                  ;(placeholder as HTMLElement).style.display = 'flex'
                                }
                              }}
                            />
                            <div className={`${styles.placeholderArt} placeholder`} style={{ display: 'none' }}>
                              <i className="fa-solid fa-music"></i>
                            </div>
                          </>
                        ) : (
                          <div className={styles.placeholderArt}>
                            <i className="fa-solid fa-music"></i>
                          </div>
                        )}
                      </div>

                      {/* Song Info */}
                      <div className={styles.cardInfo}>
                        <div className={styles.cardTitle}>{song.metadata?.title || song.name}</div>
                        <div className={styles.cardArtist}>{song.metadata?.artist || 'Unknown Artist'}</div>
                        {song.metadata?.album && <div className={styles.cardAlbum}>{song.metadata.album}</div>}
                      </div>

                      {/* Quick Toggle Button */}
                      <button
                        className={`${styles.quickToggleButton} ${isInPlaylist ? styles.inPlaylist : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleSong(song)
                        }}
                        title={
                          isInPlaylist ? t('playlistDetail.removeFromPlaylist') : t('playlistDetail.addToPlaylist')
                        }
                      >
                        <i className={`fa-solid ${isInPlaylist ? 'fa-check' : 'fa-plus'}`}></i>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Box>
      </Modal>
    </div>
  )
}
