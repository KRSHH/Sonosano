import React, { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import styles from './recentlyPlayed.module.css'
import { downloadEvents } from '../../utils/downloadEvents'
import { usePlaybackManager } from '../../hooks/usePlaybackManager'
import { formatBytes, formatDuration } from '../../utils/format'
import { apiClient } from '../../api/apiClient'
import { DownloadItem } from '../../types'
import { useDownloads } from '../../hooks/useDownloads'
import { DEFAULT_PLAYLIST_THUMBNAIL } from '../../utils/constants'
import { getStatusIcon, getStatusColor } from '../../utils/statusUtils'

const RecentlyPlayed: React.FC = () => {
  const { t } = useTranslation()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [activeFilter, setActiveFilter] = useState<'all' | 'queued' | 'downloading'>('all')
  const { playbackManager, playbackState } = usePlaybackManager()
  const { isPlaying, currentSong } = playbackState
  const queryClient = useQueryClient()

  const { data: downloads = [] } = useDownloads()

  useEffect(() => {
    const handleDownloadStarted = (event: CustomEvent) => {
      const newDownload = event.detail

      queryClient.setQueryData(['downloadStatus'], (oldData: DownloadItem[] = []) => {
        const exists = oldData.some((d) => d.id === newDownload.id)
        if (exists) return oldData

        const newItem: DownloadItem = {
          id: newDownload.id,
          fileName: newDownload.fileName,
          path: newDownload.path,
          size: newDownload.size || 0,
          metadata: newDownload.metadata,
          status: 'queued',
          progress: 0,
          downloadSpeed: 0,
          timeRemaining: 0,
          timestamp: new Date(),
        }

        return [newItem, ...oldData]
      })
    }

    const handleDownloadFailed = (event: CustomEvent) => {
      const { id, error } = event.detail

      queryClient.setQueryData(['downloadStatus'], (oldData: DownloadItem[] = []) =>
        oldData.map((d) => (d.id === id ? { ...d, status: 'failed' as const, errorMessage: error } : d))
      )
    }

    downloadEvents.addEventListener('downloadStarted', handleDownloadStarted as EventListener)
    downloadEvents.addEventListener('downloadFailed', handleDownloadFailed as EventListener)

    return () => {
      downloadEvents.removeEventListener('downloadStarted', handleDownloadStarted as EventListener)
      downloadEvents.removeEventListener('downloadFailed', handleDownloadFailed as EventListener)
    }
  }, [queryClient])

  const handlePlayPause = (item: DownloadItem) => {
    if (currentSong?.id === item.id) {
      if (isPlaying) {
        playbackManager.pause()
      } else {
        playbackManager.resume()
      }
    } else {
      playbackManager.playSong({
        id: item.id,
        name: item.fileName,
        path: item.path,
        metadata: item.metadata,
      })
    }
  }

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const cancelDownload = async (item: DownloadItem) => {
    try {
      await apiClient.cancelDownloadById(item.id)

      queryClient.setQueryData(['downloadStatus'], (oldData: DownloadItem[] = []) =>
        oldData.filter((d) => d.id !== item.id)
      )
    } catch (error) {
      console.error('Failed to cancel download:', error)
    }
  }

  const formatSpeed = (bytesPerSecond?: number): string => {
    if (!bytesPerSecond) return ''
    return `${formatBytes(bytesPerSecond)}/s`
  }

  const filteredDownloads = downloads.filter((item) => {
    switch (activeFilter) {
      case 'queued':
        return item.status === 'queued'
      case 'downloading':
        return item.status === 'downloading'
      case 'all':
      default:
        return true
    }
  })

  if (downloads.length === 0) {
    return (
      <div className={styles.emptyState}>
        <i className="fa-solid fa-download" />
        <p>{t('recentlyPlayed.noRecentDownloads')}</p>
        <span>{t('recentlyPlayed.noRecentDownloadsDescription')}</span>
      </div>
    )
  }

  return (
    <div className={styles.recentlyPlayed}>
      <div className={styles.filterTabs}>
        <button
          className={`${styles.filterTab} ${activeFilter === 'all' ? styles.activeTab : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          {t('recentlyPlayed.all')}
        </button>
        <button
          className={`${styles.filterTab} ${activeFilter === 'queued' ? styles.activeTab : ''}`}
          onClick={() => setActiveFilter('queued')}
        >
          {t('recentlyPlayed.queued')}
        </button>
        <button
          className={`${styles.filterTab} ${activeFilter === 'downloading' ? styles.activeTab : ''}`}
          onClick={() => setActiveFilter('downloading')}
        >
          {t('recentlyPlayed.downloading')}
        </button>
      </div>

      <div className={styles.downloadList}>
        {filteredDownloads.length === 0 ? (
          <div className={styles.emptyFilterState}>
            <i className="fa-solid fa-filter" />
            <p>{t('recentlyPlayed.noItemsForFilter', { filter: activeFilter })}</p>
            <span>{t('recentlyPlayed.noItemsForFilterDescription')}</span>
          </div>
        ) : (
          filteredDownloads.map((item) => (
            <div
              key={item.id}
              className={`${styles.downloadItem} ${expandedItems.has(item.id) ? styles.expanded : ''}`}
            >
              <div className={styles.itemHeader}>
                <div className={styles.itemInfo}>
                  {item.metadata?.coverArt ? (
                    <img
                      src={item.metadata.coverArt}
                      alt={item.metadata.title}
                      className={styles.coverArt}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement

                        target.src = DEFAULT_PLAYLIST_THUMBNAIL
                      }}
                    />
                  ) : (
                    <div className={styles.coverPlaceholder}>
                      <i className="fa-solid fa-music" />
                    </div>
                  )}

                  <div className={styles.details}>
                    <div className={styles.title}>{item.metadata?.title || item.fileName}</div>
                    {item.metadata?.artist && <div className={styles.artist}>{item.metadata.artist}</div>}
                    <div className={styles.statusLine}>
                      <span className={`${styles.status} ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        <span>{item.status}</span>
                      </span>
                      {item.queuePosition && item.status === 'queued' && (
                        <span className={styles.queuePosition}>
                          {t('recentlyPlayed.queuePosition', { position: item.queuePosition })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.itemActions}>
                  {item.status === 'completed' && (
                    <button
                      className={`${styles.playButton} ${currentSong?.id === item.id && isPlaying ? styles.playing : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePlayPause(item)
                      }}
                      title={currentSong?.id === item.id && isPlaying ? t('common.pause') : t('common.play')}
                    >
                      <i className={`fa-solid ${currentSong?.id === item.id && isPlaying ? 'fa-pause' : 'fa-play'}`} />
                    </button>
                  )}

                  {(item.status === 'queued' || item.status === 'downloading') && (
                    <button
                      className={styles.cancelButton}
                      onClick={(e) => {
                        e.stopPropagation()
                        cancelDownload(item)
                      }}
                      title={t('common.cancel')}
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  )}

                  <button
                    className={styles.infoButton}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpand(item.id)
                    }}
                    title={t('recentlyPlayed.showDetails')}
                  >
                    <i className={`fa-solid fa-chevron-${expandedItems.has(item.id) ? 'up' : 'down'}`} />
                  </button>
                </div>
              </div>

              {/* Progress bar for downloading items */}
              {item.status === 'downloading' && (
                <div className={styles.progressContainer}>
                  <div
                    className={styles.progressBar}
                    style={{ position: 'relative', height: '4px', backgroundColor: 'rgba(255,255,255,0.1)' }}
                  >
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${Math.max(0, Math.min(100, item.progress))}%`,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        background: 'linear-gradient(90deg, #1db954 0%, #1ed760 100%)',
                        borderRadius: '2px',
                        transition: 'width 0.3s ease',

                        minWidth: item.progress > 0 ? '2px' : '0',
                      }}
                    />
                  </div>
                  <div className={styles.progressInfo}>
                    <span>{item.progress.toFixed(1)}%</span>
                    {item.downloadSpeed && item.downloadSpeed > 0 && <span>{formatSpeed(item.downloadSpeed)}</span>}
                    {item.timeRemaining && item.timeRemaining > 0 && (
                      <span>{t('recentlyPlayed.timeLeft', { duration: formatDuration(item.timeRemaining) })}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Expanded details */}
              {expandedItems.has(item.id) && (
                <div className={styles.expandedContent}>
                  <div className={styles.detailRow}>
                    <span className={styles.label}>File:</span>
                    <span className={styles.value}>{item.fileName}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.label}>Size:</span>
                    <span className={styles.value}>{formatBytes(item.size)}</span>
                  </div>
                  {item.metadata?.album && (
                    <div className={styles.detailRow}>
                      <span className={styles.label}>Album:</span>
                      <span className={styles.value}>{item.metadata.album}</span>
                    </div>
                  )}
                  {item.errorMessage && (
                    <div className={styles.detailRow}>
                      <span className={styles.label}>Error:</span>
                      <span className={styles.errorValue}>{item.errorMessage}</span>
                    </div>
                  )}
                  <div className={styles.detailRow}>
                    <span className={styles.label}>Path:</span>
                    <span className={styles.pathValue} title={item.path}>
                      {item.path}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default RecentlyPlayed
