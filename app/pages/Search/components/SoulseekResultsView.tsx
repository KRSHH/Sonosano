import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSoulseekSearchStream } from '../../../hooks/useSoulseekSearchStream'
import { MusicBrainzRecording, UserResult, AlbumResult, SoulseekFile } from '../../../types'
import { apiClient } from '../../../api/apiClient'
import styles from '../search.module.css' // Reusing styles for consistency
import { formatBytes } from '../../../utils/format'

interface SoulseekResultsViewProps {
  searchId: string
  metadata: MusicBrainzRecording
}

export default function SoulseekResultsView({ searchId, metadata }: SoulseekResultsViewProps) {
  const { t } = useTranslation()
  const { startSearch, stopSearch, subscribe } = useSoulseekSearchStream()
  const [results, setResults] = useState<UserResult[]>([])
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({})
  const [expandedAlbums, setExpandedAlbums] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const query = metadata.title
    startSearch(query, searchId)

    const unsubscribe = subscribe(searchId, (data: UserResult[]) => {
      setResults(data)
    })

    return () => {
      unsubscribe()
      stopSearch(searchId)
    }
  }, [searchId, metadata.title, startSearch, stopSearch, subscribe])

  const toggleUser = (username: string) => {
    setExpandedUsers((prev) => ({ ...prev, [username]: !prev[username] }))
  }

  const toggleAlbum = (albumIdentifier: string) => {
    setExpandedAlbums((prev) => ({ ...prev, [albumIdentifier]: !prev[albumIdentifier] }))
  }

  const handleDownloadFile = (file: SoulseekFile) => {
    // This will use the existing download logic
    apiClient.startDownload(file.username, file.path, file.size, metadata)
  }

  const handleDownloadAlbum = async (album: AlbumResult, username: string) => {
    try {
      await apiClient.startAlbumDownload({
        username,
        artist: metadata.artist || 'Unknown Artist',
        album: album.album,
        files: album.files,
        metadata: {
          title: metadata.title,
          artist: metadata.artist,
          album: album.album,
          coverArt: metadata.coverArt,
        },
      })
      // You can add a toast notification here, e.g., using a library like react-toastify
      alert(`Started download for album: ${album.album}`)
    } catch (error) {
      console.error('Failed to start album download:', error)
      alert(`Error starting download for album: ${album.album}`)
    }
  }

  return (
    <div className={styles.soulseekResultsContainer}>
      <div className={styles.resultsHeader}>
        <img src={metadata.coverArt} alt={metadata.title} className={styles.headerCoverArt} />
        <div className={styles.headerInfo}>
          <h2>{metadata.title}</h2>
          <p>{metadata.artist}</p>
        </div>
      </div>

      <div className={styles.resultsList}>
        {results.map((userResult) => (
          <div key={userResult.username} className={styles.userResult}>
            <div className={styles.userHeader} onClick={() => toggleUser(userResult.username)}>
              <strong>{userResult.username}</strong>
              <span>{`(${userResult.albums.length} albums)`}</span>
            </div>
            {expandedUsers[userResult.username] && (
              <div className={styles.albumList}>
                {userResult.albums.map((albumResult) => {
                  const albumId = `${userResult.username}-${albumResult.album}`
                  return (
                    <div key={albumId} className={styles.albumResult}>
                      <div className={styles.albumHeader} onClick={() => toggleAlbum(albumId)}>
                        <span>{albumResult.album}</span>
                        <button
                          className={styles.downloadAlbumButton}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadAlbum(albumResult, userResult.username)
                          }}
                        >
                          {t('search.downloadAlbum')}
                        </button>
                      </div>
                      {expandedAlbums[albumId] && (
                        <div className={styles.fileList}>
                          {albumResult.files.map((file) => (
                            <div key={`${file.username}-${file.path}`} className={styles.fileItem}>
                              <div className={styles.fileDetails}>
                                <span className={styles.fileName}>{file.path.split('\\').pop()}</span>
                                <span className={styles.fileMetadata}>
                                  {formatBytes(file.size)} | {file.bitrate}kbps | {file.length}
                                </span>
                              </div>
                              <button
                                className={styles.downloadButton}
                                onClick={() => handleDownloadFile(file)}
                              >
                                <i className="fa-solid fa-download"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}