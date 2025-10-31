import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './playlists.module.css'
import CreatePlaylistModal from '../../components/playlists/CreatePlaylistModal'
import EditPlaylistModal from '../../components/playlists/EditPlaylistModal'
import { useTranslation } from 'react-i18next'
import { usePlaybackManager } from '../../hooks/usePlaybackManager'
import { apiClient } from '../../api'
import { Playlist } from '../../types'
import { useLibrarySongs } from '../../hooks/useLibrarySongs'
import { usePlaylistPlayback } from '../../hooks/usePlaylistPlayback'

interface PlaylistsProps {
  refreshSidebarData?: () => void
}

const PlaylistCard = ({
  playlist,
  onPlay,
  onEdit,
  onDelete,
  onToggleMenu,
  openMenuId,
}: {
  playlist: Playlist
  onPlay: (e: React.MouseEvent, playlist: Playlist) => void
  onEdit: (playlist: Playlist) => void
  onDelete: (playlist: Playlist) => void
  onToggleMenu: (id: string) => void
  openMenuId: string | null
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isPlaying, isCurrentPlaylist } = usePlaylistPlayback(playlist)
  const { data: libraryFiles = [] } = useLibrarySongs()

  const getCurrentPlaylistSongs = (p: Playlist) => libraryFiles.filter((file) => p.songs.includes(file.path))

  const getPlaylistDuration = (p: Playlist): string => {
    const playlistSongs = getCurrentPlaylistSongs(p)
    let totalSeconds = 0

    playlistSongs.forEach((song) => {
      if (song.metadata?.duration) {
        let duration = song.metadata.duration
        if (duration > 3600) {
          duration = Math.floor(duration / 1000)
        }
        totalSeconds += duration
      }
    })

    if (totalSeconds === 0) return '0 min'

    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)

    if (hours > 0) {
      return `${hours} hr ${minutes} min`
    } else {
      return `${minutes} min`
    }
  }

  return (
    <div key={playlist.id} className={styles.songCard} onClick={() => navigate(`/playlist-detail/${playlist.id}`)}>
      <div className={styles.albumArt}>
        {playlist.thumbnail ? (
          <img
            src={apiClient.getCoverUrl(playlist.thumbnail)}
            alt={playlist.name}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              if (target.parentElement) {
                const placeholder = document.createElement('div')
                placeholder.className = styles.placeholderArt
                placeholder.innerHTML = '<i class="fa-solid fa-music"></i>'
                target.parentElement.appendChild(placeholder)
              }
            }}
          />
        ) : (
          <div className={styles.placeholderArt}>
            <i className="fa-solid fa-music"></i>
          </div>
        )}

        <button
          className={`${styles.playOverlay} ${isCurrentPlaylist && isPlaying ? styles.pauseButton : styles.playButton}`}
          onClick={(e) => onPlay(e, playlist)}
          title={t(isCurrentPlaylist && isPlaying ? 'playlists.pause' : 'playlists.play')}
        >
          <i className={`fa-solid fa-${isCurrentPlaylist && isPlaying ? 'pause' : 'play'}`}></i>
        </button>
      </div>

      <div
        className={styles.songInfo}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <h3 className={styles.songTitle}>{playlist.name}</h3>
          <p className={styles.songArtist}>
            {getPlaylistDuration(playlist)} • {t('common.songs', { count: playlist.songs?.length || 0 })}
          </p>
        </div>

        <div className={styles.dropdownWrapper} style={{ position: 'relative' }}>
          <button
            className={styles.moreButton}
            onClick={(e) => {
              e.stopPropagation()
              onToggleMenu(playlist.id)
            }}
            title={t('playlists.moreOptions')}
            style={{
              background: 'none',
              border: 'none',
              color: '#b3b3b3',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <i className="fa-solid fa-ellipsis-vertical"></i>
          </button>

          {openMenuId === playlist.id && (
            <div className={styles.dropdownMenu}>
              <button
                className={styles.dropdownItem}
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(playlist)
                  onToggleMenu(playlist.id)
                }}
              >
                <i className="fa-solid fa-edit"></i>
                {t('playlists.editDetails')}
              </button>
              <div className={styles.dropdownDivider}></div>
              <button
                className={`${styles.dropdownItem} ${styles.deleteItem}`}
                onClick={async (e) => {
                  e.stopPropagation()
                  await onDelete(playlist)
                  onToggleMenu(playlist.id)
                }}
              >
                <i className="fa-solid fa-trash"></i>
                {t('common.delete')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Playlists({ refreshSidebarData }: PlaylistsProps) {
  const { t } = useTranslation()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const { data: libraryFiles = [] } = useLibrarySongs()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  useState<'grid' | 'list'>('grid')

  const { playbackManager } = usePlaybackManager()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)

  const [searchQuery, setSearchQuery] = useState('')

  const loadPlaylists = async () => {
    try {
      setLoading(true)
      setError(null)
      const playlists = await apiClient.getPlaylists()
      setPlaylists(playlists)
    } catch {
      setError('Failed to load playlists')
      setPlaylists([])
    } finally {
      setLoading(false)
    }
  }

  const deletePlaylist = async (playlistId: string) => {
    try {
      await apiClient.deletePlaylist(playlistId)
      setPlaylists((prevPlaylists) => prevPlaylists.filter((p) => p.id !== playlistId))
      refreshSidebarData?.()
    } catch {
      setError('Failed to delete playlist')
      loadPlaylists()
    }
  }

  const handleEditPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist)
    setEditModalOpen(true)
  }

  const handleDeletePlaylist = (playlist: Playlist) => {
    deletePlaylist(playlist.id)
  }

  const { isPlaying, isCurrentPlaylist } = usePlaylistPlayback(playlists.find((p) => p.id === openMenuId) || null)
  const handlePlayPlaylist = (e: React.MouseEvent, playlist: Playlist) => {
    e.stopPropagation()
    e.preventDefault()

    const playlistSongs = libraryFiles.filter((file) => playlist.songs.includes(file.path))

    if (playlistSongs.length === 0) {
      return
    }

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

  const toggleMenu = (playlistId: string) => {
    setOpenMenuId(openMenuId === playlistId ? null : playlistId)
  }

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null)
    }

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [openMenuId])

  const filteredPlaylists = playlists.filter(
    (playlist) =>
      playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      playlist.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    loadPlaylists()
  }, [])

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p className={styles.loading}>{t('playlists.loading')}</p>
      </div>
    )
  }

  return (
    <div className={styles.playlistsContainer}>
      <div className={styles.libraryHeader}>
        <div className={styles.headerLeft}>
          <h1>{t('playlists.title')}</h1>
          <span className={styles.songCount}>{t('common.playlist_other', { count: filteredPlaylists.length })}</span>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.searchBar}>
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              placeholder={t('playlists.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button className={styles.refreshButton} onClick={() => setCreateModalOpen(true)}>
            <i className="fa-solid fa-plus" />
            {t('playlists.create')}
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorContainer}>
          <i className="fa-solid fa-exclamation-circle"></i>
          <h3>{t('playlists.errorTitle')}</h3>
          <p>{error}</p>
          <button onClick={loadPlaylists} className={styles.retryButton}>
            <i className="fa-solid fa-rotate-right"></i>
            {t('common.retry')}
          </button>
        </div>
      )}

      {!error && (
        <>
          {filteredPlaylists.length === 0 ? (
            <div className={styles.emptyState}>
              {searchQuery ? (
                <>
                  <i className="fa-solid fa-search" />
                  <h3>{t('playlists.emptySearchTitle')}</h3>
                  <p>{t('playlists.emptySearchDescription')}</p>
                  <button onClick={() => setSearchQuery('')} className={styles.clearSearchButton}>
                    {t('playlists.clearSearch')}
                  </button>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-music" />
                  <h3>{t('playlists.emptyTitle')}</h3>
                  <p>{t('playlists.emptyDescription')}</p>
                  <button onClick={() => setCreateModalOpen(true)} className={styles.refreshButton}>
                    <i className="fa-solid fa-plus" />
                    {t('playlists.createFirst')}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className={styles.gridView}>
              {filteredPlaylists.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onPlay={handlePlayPlaylist}
                  onEdit={handleEditPlaylist}
                  onDelete={handleDeletePlaylist}
                  onToggleMenu={toggleMenu}
                  openMenuId={openMenuId}
                />
              ))}
            </div>
          )}
        </>
      )}

      <CreatePlaylistModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onPlaylistCreated={() => {
          loadPlaylists()
          refreshSidebarData?.()
        }}
      />
      <EditPlaylistModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        playlist={selectedPlaylist}
        onPlaylistUpdated={() => {
          loadPlaylists()
          refreshSidebarData?.()
        }}
      />
    </div>
  )
}
