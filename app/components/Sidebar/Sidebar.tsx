import React from 'react'
import { useTranslation } from 'react-i18next'
import RecentlyPlayed from 'components/RecentlyPlayed/RecentlyPlayed'
import { useDownloads } from '../../hooks/useDownloads'
import { usePlaybackManager } from '../../hooks/usePlaybackManager'
import styles from './sidebar.module.css'

interface ExtendedPropsSidebar {
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export default function Sidebar({ isCollapsed = false, onToggleCollapse }: ExtendedPropsSidebar) {
  const { t } = useTranslation()
  const { data: downloads = [] } = useDownloads()
  const { playbackManager } = usePlaybackManager()

  const recentThumbnails = downloads
    .filter(
      (item) =>
        (item.status === 'completed' || item.status === 'downloading' || item.status === 'queued') &&
        item.metadata?.coverArt
    )
    .reduce(
      (unique, item) => {
        const coverArt = item.metadata?.coverArt
        if (coverArt && !unique.some((existing) => existing.metadata?.coverArt === coverArt)) {
          unique.push(item)
        }
        return unique
      },
      [] as typeof downloads
    )
    .slice(0, 5)

  return (
    <>
      <div className={`${styles.wrapperNavbar} ${isCollapsed ? styles.collapsed : styles.expanded}`}>
        {/* Recently Downloaded Section - Full Height */}
        <div className={`${styles.recentlyPlayedSection} ${isCollapsed ? styles.collapsedContainer : ''}`}>
          {/* Header with Recents title and toggle button */}
          <div className={styles.sectionHeader}>
            {!isCollapsed && (
              <div className={styles.recentsTitle}>
                <span>{t('sidebar.recents')}</span>
              </div>
            )}
            <button
              className={styles.toggleButton}
              onClick={onToggleCollapse}
              title={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            >
              {isCollapsed ? (
                <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11.03 8 6.53 3.5A.75.75 0 0 0 5.47 4.56L9.44 8.5 5.47 12.44A.75.75 0 0 0 6.53 13.5L11.03 9A.75.75 0 0 0 11.03 8Z" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M5.03 8 9.53 3.5A.75.75 0 0 1 10.59 4.56L6.62 8.5 10.59 12.44A.75.75 0 0 1 9.53 13.5L5.03 9A.75.75 0 0 1 5.03 8Z" />
                </svg>
              )}
            </button>
          </div>

          {/* Content */}
          {isCollapsed ? (
            <div className={styles.collapsedContent}>
              {recentThumbnails.length > 0 ? (
                <div className={styles.thumbnailGrid}>
                  {recentThumbnails.map((item) => (
                    <div
                      key={item.id}
                      className={`${styles.thumbnail} ${item.status === 'downloading' || item.status === 'queued' ? styles.downloading : ''}`}
                      title={`${item.metadata?.title || item.fileName}${item.metadata?.artist ? ` - ${item.metadata.artist}` : ''}${item.status === 'downloading' ? ` (${item.progress.toFixed(1)}%)` : ''}${item.status === 'queued' ? ' (Queued)' : ''}`}
                      onClick={() => {
                        if (item.status === 'completed' && item.path) {
                          const fileData: Song = {
                            id: item.id,
                            name: item.fileName,
                            path: item.path,
                            metadata: item.metadata,
                          }
                          playbackManager.playSong(fileData)
                        }
                      }}
                    >
                      <img
                        src={item.metadata?.coverArt}
                        alt={item.metadata?.title || item.fileName}
                        className={styles.thumbnailImage}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const placeholder = document.createElement('div')
                          placeholder.className = styles.thumbnailPlaceholder
                          placeholder.innerHTML = '<i class="fa-solid fa-music"></i>'
                          target.parentElement?.appendChild(placeholder)
                        }}
                      />

                      {/* Progress overlay for downloading items */}
                      {(item.status === 'downloading' || item.status === 'queued') && (
                        <div className={styles.thumbnailOverlay}>
                          <div className={styles.progressText}>
                            {item.status === 'downloading' ? `${item.progress.toFixed(0)}%` : 'Q'}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.collapsedIcon} title={t('sidebar.recentlyDownloaded')}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8z" />
                    <path d="M12 6a1 1 0 0 0-1 1v4.414l-1.293-1.293a1 1 0 0 0-1.414 1.414l3 3a1 1 0 0 0 1.414 0l3-3a1 1 0 0 0-1.414-1.414L13 11.414V7a1 1 0 0 0-1-1z" />
                  </svg>
                </div>
              )}
            </div>
          ) : (
            <RecentlyPlayed />
          )}
        </div>
      </div>
    </>
  )
}
