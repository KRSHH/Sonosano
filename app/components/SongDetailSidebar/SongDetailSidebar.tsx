import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useState, useMemo } from 'react'
// @ts-expect-error - Module is a CSS module, TypeScript needs to be informed about the import type
import styles from './songDetailSidebar.module.css'
import { formatBytes, formatDuration } from '../../utils/format'
import { sortSoulseekFiles } from '../../utils/fileSorter'
// @ts-expect-error - Module is a CSS module, TypeScript needs to be informed about the import type
import { useSongDetailSidebar } from '../../providers/SongDetailSidebarProvider.tsx'
// @ts-expect-error - Module is a CSS module, TypeScript needs to be informed about the import type
import { getStatusMessageKey, getStatusColor } from '../../utils/statusUtils.tsx'

const SongDetailSidebar = () => {
  const { t } = useTranslation()
  const {
    selectedSong,
    soulseekFiles,
    downloadStatus,
    handleDownloadFile,
    sidebarLoading,
    searchQuery,
    setSelectedSong,
  } = useSongDetailSidebar()

  const [selectedFileType, setSelectedFileType] = useState<string>('all')

  // Get unique file extensions from the files
  const fileTypes = useMemo(() => {
    const extensions = new Set<string>()
    soulseekFiles.forEach((file) => {
      if (file.extension) {
        extensions.add(file.extension.toLowerCase())
      }
    })
    return Array.from(extensions).sort()
  }, [soulseekFiles])

  // Filter files by selected file type
  const filteredFiles = useMemo(() => {
    if (!selectedFileType || selectedFileType === 'all') return soulseekFiles
    return soulseekFiles.filter((file) => file.extension?.toLowerCase() === selectedFileType.toLowerCase())
  }, [soulseekFiles, selectedFileType])

  const sortedFiles = sortSoulseekFiles(filteredFiles, searchQuery)

  const onClose = () => {
    setSelectedSong(null)
  }

  if (!selectedSong) {
    return null
  }

  return (
    <div className={styles.sidebarContainer}>
      {/* Close button */}
      <button
        className={styles.closeButton}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation() // Prevent event bubbling
          onClose()
        }}
        aria-label="Close sidebar"
        title={t('common.close')}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M1 1L13 13M1 13L13 1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className={styles.songDetails}>
        {selectedSong.coverArt ? (
          <img
            src={selectedSong.coverArt}
            alt={selectedSong.title}
            className={styles.coverArt}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = 'assets/imgs/DefaultThumbnailPlaylist.jpg'
            }}
          />
        ) : (
          <div className={styles.placeholderCover}>
            <i className="fa-solid fa-music"></i>
          </div>
        )}
        <div className={styles.songInfo}>
          <h2 className={styles.songTitle}>{selectedSong.title}</h2>
          <p className={styles.songArtist}>{selectedSong.artist}</p>
          {selectedSong.album && <p className={styles.songAlbum}>{selectedSong.album}</p>}
          {selectedSong.length && <p className={styles.songDuration}>{formatDuration(selectedSong.length)}</p>}
        </div>
      </div>

      <div className={styles.filesHeader}>
        <h3 className={styles.filesTitle}>{`${sortedFiles.length} Available Files`}</h3>
        {fileTypes.length > 0 && (
          <div className={styles.dropdownContainer}>
            <select
              value={selectedFileType}
              onChange={(e) => setSelectedFileType(e.target.value)}
              className={styles.fileTypeDropdown}
              aria-label={t('songDetailSidebar.filterByFileType')}
            >
              <option value="all">{t('common.allFiles', 'All Files')}</option>
              {fileTypes.map((ext) => (
                <option key={ext} value={ext}>
                  {ext.toUpperCase().replace('.', '')}
                </option>
              ))}
            </select>
            <div className={styles.dropdownArrow}>▼</div>
          </div>
        )}
      </div>

      {sidebarLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
        </div>
      ) : (
        <div className={styles.filesList}>
          {sortedFiles.length > 0 ? (
            sortedFiles.map((file) => {
              const isLossless =
                file.extension?.toLowerCase() === '.flac' ||
                file.extension?.toLowerCase() === '.wav' ||
                file.quality?.toLowerCase().includes('lossless') ||
                file.path.toLowerCase().endsWith('.flac') ||
                file.path.toLowerCase().endsWith('.wav')
              return (
                <div key={file.id} className={`${styles.fileItem} ${isLossless ? styles.losslessFile : ''}`}>
                  <div className={styles.fileDetails}>
                    <h4 className={styles.fileName}>{file.path.split('\\').pop()}</h4>
                    <div className={styles.fileMetadata}>
                      <span>{formatBytes(file.size)}</span>
                      {file.length && (
                        <span className={styles.lengthTag}>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={styles.clockIcon}
                          >
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          {file.length}
                        </span>
                      )}
                      {file.quality && <span className={styles.qualityTag}>{file.quality}</span>}
                      {file.extension && (
                        <span className={styles.qualityTag}>{file.extension.replace('.', '').toUpperCase()}</span>
                      )}
                    </div>
                  </div>

                  {downloadStatus[file.id] ? (
                    <div className={styles.downloadStatus}>
                      <div className={styles.statusInfo}>
                        <span className={`${styles.statusBadge} ${getStatusColor(downloadStatus[file.id].status)}`}>
                          {t(getStatusMessageKey(downloadStatus[file.id].status))}
                        </span>
                        {downloadStatus[file.id].status === 'Transferring' && (
                          <span className={styles.percentage}>{downloadStatus[file.id].percent.toFixed(0)}%</span>
                        )}
                      </div>

                      {downloadStatus[file.id].status === 'Transferring' && (
                        <div className={styles.progressBar}>
                          <div
                            className={styles.progressFill}
                            style={{ width: `${downloadStatus[file.id].percent}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      className={styles.downloadButton}
                      onClick={() => handleDownloadFile(file)}
                      // Disable the button if a download is queued or in progress
                      disabled={
                        downloadStatus[file.id] &&
                        !['Finished', 'Error', 'Cancelled'].includes(downloadStatus[file.id].status)
                      }
                    >
                      <i className="fa-solid fa-download"></i>
                    </button>
                  )}
                </div>
              )
            })
          ) : (
            <div className={styles.noFiles}>
              <p>{t('songDetailSidebar.noFiles')}</p>
              <p className={styles.subtext}>{t('songDetailSidebar.trySearching')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SongDetailSidebar
