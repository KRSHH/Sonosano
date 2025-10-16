import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { apiClient } from '../../../api/apiClient'
import { Song } from '../../../types'
import { Playlist } from '../../../types'
import { DEFAULT_PLAYLIST_THUMBNAIL } from '../../../utils/constants'
import styles from './addToPlaylistMenu.module.css'

interface AddToPlaylistMenuProps {
  song: Song
  onClose: () => void
}

export default function AddToPlaylistMenu({ song, onClose }: AddToPlaylistMenuProps) {
  const { t } = useTranslation()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [songPlaylists, setSongPlaylists] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        setLoading(true)
        const allPlaylists = await apiClient.getPlaylists()
        setPlaylists(allPlaylists)

        const songInPlaylists = new Set<string>()
        allPlaylists.forEach((playlist) => {
          if (playlist.songs.includes(song.path)) {
            songInPlaylists.add(playlist.id)
          }
        })
        setSongPlaylists(songInPlaylists)
      } catch (error) {
        console.error('Failed to fetch playlists:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlaylists()
  }, [song])

  const handleTogglePlaylist = async (playlistId: string) => {
    const isSongInPlaylist = songPlaylists.has(playlistId)
    const originalSongPlaylists = new Set(songPlaylists)

    // Optimistic UI update
    const updatedSongPlaylists = new Set(songPlaylists)
    if (isSongInPlaylist) {
      updatedSongPlaylists.delete(playlistId)
    } else {
      updatedSongPlaylists.add(playlistId)
    }
    setSongPlaylists(updatedSongPlaylists)

    try {
      if (isSongInPlaylist) {
        await apiClient.removeSongFromPlaylist(playlistId, song.path)
      } else {
        await apiClient.addSongToPlaylist(playlistId, song.path)
      }
    } catch (error) {
      console.error('Failed to toggle song in playlist:', error)
      // Revert on error
      setSongPlaylists(originalSongPlaylists)
    }
  }

  const filteredPlaylists = playlists.filter((playlist) =>
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className={styles.menuContainer}>
      <div className={styles.header}>
        <h3>{t('addToPlaylistMenu.title')}</h3>
      </div>
      <div className={styles.searchContainer}>
        <svg className={styles.searchIcon} viewBox="0 0 16 16">
          <path d="M7 1.75a5.25 5.25 0 1 0 0 10.5 5.25 5.25 0 0 0 0-10.5M.25 7a6.75 6.75 0 1 1 12.096 4.12l3.184 3.185a.75.75 0 1 1-1.06 1.06L11.304 12.2A6.75 6.75 0 0 1 .25 7"></path>
        </svg>
        <input
          type="text"
          placeholder={t('addToPlaylistMenu.find')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>
      {loading ? (
        <div className={styles.loading}>{t('addToPlaylistMenu.loading')}</div>
      ) : (
        <ul className={styles.playlistList}>
          {filteredPlaylists.map((playlist) => (
            <li key={playlist.id} onClick={() => handleTogglePlaylist(playlist.id)}>
              <div className={styles.playlistInfo}>
                <img
                  src={apiClient.getCoverUrl(playlist.thumbnail)}
                  alt={playlist.name}
                  className={styles.thumbnail}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = DEFAULT_PLAYLIST_THUMBNAIL
                  }}
                />
                <div className={styles.playlistDetails}>
                  <span className={styles.playlistName}>{playlist.name}</span>
                  <span className={styles.songCount}>{t('common.songs', { count: playlist.songs.length })}</span>
                </div>
              </div>
              {songPlaylists.has(playlist.id) ? (
                <svg
                  data-encore-id="icon"
                  role="img"
                  aria-hidden="true"
                  className={styles.checkIcon}
                  viewBox="0 0 16 16"
                >
                  <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m11.748-1.97a.75.75 0 0 0-1.06-1.06l-4.47 4.47-1.405-1.406a.75.75 0 1 0-1.061 1.06l2.466 2.467 5.53-5.53z"></path>
                </svg>
              ) : (
                <div className={styles.checkbox}></div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className={styles.footer}>
        <button onClick={onClose} className={styles.cancelButton}>
          {t('common.cancel')}
        </button>
        <button onClick={onClose} className={styles.doneButton}>
          {t('common.done')}
        </button>
      </div>
    </div>
  )
}
