import React, { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import styles from './library.module.css'
import { usePlaybackManager } from '../../hooks/usePlaybackManager'
import { Song as LibraryFile } from '../../types'
import { apiClient } from '../../api'
import { useLibrarySongs } from '../../hooks/useLibrarySongs'
import { formatBytes } from '../../utils/format'

export default function Library() {
  const { t } = useTranslation()
  const [sortBy] = useState<'name' | 'artist' | 'date' | 'size'>('date')
  const [filterQuery, setFilterQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [showGeneratingPopup, setShowGeneratingPopup] = useState(false)

  const { playbackManager, playbackState } = usePlaybackManager()
  const { isPlaying, currentSong } = playbackState
  const { data: libraryFiles = [], isLoading, error } = useLibrarySongs()
  const queryClient = useQueryClient()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['librarySongs'] })
  }

  const showInExplorer = async (file: LibraryFile) => {
    try {
      await apiClient.showInExplorer(file.path)
    } catch (err) {
      console.error('Show in Explorer failed:', err)
    }
  }

  const refreshMetadata = async (file: LibraryFile) => {
    try {
      await apiClient.refreshSongMetadata(file.path)
      handleRefresh()
    } catch (err) {
      console.error('An error occurred while refreshing metadata:', err)
    }
  }

  const generateForensics = async (file: LibraryFile) => {
    try {
      await apiClient.generateForensics(file.path)
      setShowGeneratingPopup(true)
      setTimeout(() => {
        setShowGeneratingPopup(false)
      }, 2000)
    } catch (err) {
      console.error('Generate Forensics failed:', err)
    }
  }

  const toggleMenu = (fileId: string) => {
    setOpenMenuId(openMenuId === fileId ? null : fileId)
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

  const filteredFiles = libraryFiles.filter((file) => {
    if (!filterQuery) return true

    const query = filterQuery.toLowerCase()
    const title = (file.metadata?.title || file.name).toLowerCase()
    const artist = (file.metadata?.artist || '').toLowerCase()
    const album = (file.metadata?.album || '').toLowerCase()

    return title.includes(query) || artist.includes(query) || album.includes(query)
  })

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.metadata?.title || a.name).localeCompare(b.metadata?.title || b.name)
      case 'artist':
        return (a.metadata?.artist || '').localeCompare(b.metadata?.artist || '')
      case 'date':
        return new Date(b.dateAdded || 0).getTime() - new Date(a.dateAdded || 0).getTime()
      case 'size':
        return (b.size || 0) - (a.size || 0)
      default:
        return 0
    }
  })

  const handlePlayPause = (file: LibraryFile) => {
    if (currentSong?.id === file.id) {
      if (isPlaying) {
        playbackManager.pause()
      } else {
        playbackManager.resume()
      }
    } else {
      playbackManager.playSong(file, [], -1)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>{t('library.loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>{t('library.loading')}</p>
      </div>
    )
  }

  if (libraryFiles.length === 0) {
    return (
      <div className={styles.emptyState}>
        <i className="fa-solid fa-music"></i>
        <h3>{t('library.emptyTitle')}</h3>
        <p>{t('library.emptyDescription')}</p>
        <button onClick={handleRefresh} className={styles.refreshButton}>
          <i className="fa-solid fa-rotate"></i>
          {t('library.refresh')}
        </button>
      </div>
    )
  }

  return (
    <div className={styles.libraryContainer}>
      {showGeneratingPopup && <div className={styles.generatingOverlay}>{t('library.generating')}</div>}
      {/* Library Header */}
      <div className={styles.libraryHeader}>
        <div className={styles.headerLeft}>
          <h1>{t('library.title')}</h1>
          <span className={styles.songCount}>{t('common.songs', { count: sortedFiles.length })}</span>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.searchBar}>
            <i className="fa-solid fa-search"></i>
            <input
              type="text"
              placeholder={t('library.searchPlaceholder')}
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
          </div>

          <div className={styles.viewToggle}>
            <button
              className={viewMode === 'grid' ? styles.active : ''}
              onClick={() => setViewMode('grid')}
              title={t('library.viewGrid')}
            >
              <i className="fa-solid fa-grip"></i>
            </button>
            <button
              className={viewMode === 'list' ? styles.active : ''}
              onClick={() => setViewMode('list')}
              title={t('library.viewList')}
            >
              <i className="fa-solid fa-list"></i>
            </button>
          </div>

          <button onClick={handleRefresh} className={styles.refreshButton}>
            <i className="fa-solid fa-rotate"></i>
          </button>
        </div>
      </div>

      {/* Library Content */}
      <div className={viewMode === 'grid' ? styles.gridView : styles.listView}>
        {sortedFiles.map((file) => (
          <div key={file.id} className={`${viewMode === 'grid' ? styles.songCard : styles.songRow}`}>
            {/* Album Art */}
            <div className={styles.albumArt}>
              {file.metadata?.coverArt ? (
                <img
                  src={file.metadata.coverArt}
                  alt={file.metadata.title || file.name}
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

              {/* Play button overlay */}
              <button
                className={`${styles.playOverlay} ${currentSong?.id === file.id && isPlaying ? styles.playing : ''}`}
                onClick={() => handlePlayPause(file)}
                title={currentSong?.id === file.id && isPlaying ? t('common.pause') : t('common.play')}
              >
                <i className={`fa-solid ${currentSong?.id === file.id && isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
              </button>
            </div>

            {/* Song Info */}
            <div className={styles.songInfo}>
              <h3 className={styles.songTitle}>{file.metadata?.title || file.name}</h3>
              <p className={styles.songArtist}>{file.metadata?.artist || 'Unknown Artist'}</p>
              {viewMode === 'list' && (
                <div className={styles.additionalInfo}>
                  <span className={styles.fileSize}>{formatBytes(file.size || 0)}</span>
                  {file.metadata?.display_quality && (
                    <span className={`${styles.quality} ${file.metadata?.is_fake ? styles.fakeQuality : ''}`}>
                      {file.metadata.display_quality}
                    </span>
                  )}
                </div>
              )}
            </div>

            {viewMode === 'list' && <div className={styles.album}>{file.metadata?.album}</div>}

            {/* Actions */}
            <div className={styles.songActions}>
              {viewMode === 'grid' && (
                <div className={styles.cardDetails}>
                  <span className={styles.fileSize}>{formatBytes(file.size || 0)}</span>
                  {file.metadata?.display_quality && (
                    <span className={`${styles.quality} ${file.metadata?.is_fake ? styles.fakeQuality : ''}`}>
                      {file.metadata.display_quality}
                    </span>
                  )}
                </div>
              )}

              <div className={styles.dropdownWrapper}>
                <button
                  className={styles.moreButton}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleMenu(file.id)
                  }}
                  title={t('library.moreOptions')}
                >
                  <i className="fa-solid fa-ellipsis-vertical"></i>
                </button>

                {openMenuId === file.id && (
                  <div className={styles.dropdownMenu}>
                    <button
                      className={styles.dropdownItem}
                      onClick={(e) => {
                        e.stopPropagation()
                        playbackManager.playSong(file, [], -1)
                        setOpenMenuId(null)
                      }}
                    >
                      <i className="fa-solid fa-play"></i>
                      {t('common.play')}
                    </button>
                    <button
                      className={styles.dropdownItem}
                      onClick={(e) => {
                        e.stopPropagation()
                        showInExplorer(file)
                        setOpenMenuId(null)
                      }}
                    >
                      <i className="fa-solid fa-folder-open"></i>
                      {t('library.showInExplorer')}
                    </button>
                    <button
                      className={styles.dropdownItem}
                      onClick={(e) => {
                        e.stopPropagation()
                        refreshMetadata(file)
                        setOpenMenuId(null)
                      }}
                    >
                      <i className="fa-solid fa-sync"></i>
                      {t('library.refreshMetadata')}
                    </button>
                    <button
                      className={styles.dropdownItem}
                      onClick={(e) => {
                        e.stopPropagation()
                        generateForensics(file)
                        setOpenMenuId(null)
                      }}
                    >
                      <i className="fa-solid fa-chart-bar"></i>
                      {t('library.generateForensics')}
                    </button>
                    <div className={styles.dropdownDivider}></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
