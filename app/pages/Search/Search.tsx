import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSongSearch } from './hooks/useSongSearch'
import styles from './search.module.css'
import { useSongDetailSidebar } from '../../providers/SongDetailSidebarProvider'
import { apiClient } from '../../api'
import { MusicBrainzRecording, SoulseekFile } from '../../types'

export default function Search() {
  const { t } = useTranslation()
  const location = useLocation()
  const [, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const { searchResults, isSearching, searchError, performSearch } = useSongSearch()
  const {
    setSelectedSong,
    setSoulseekFiles,
    setSidebarLoading,
    setSearchQuery: setSidebarSearchQuery,
    setError: setSidebarError,
    setSearchAbortController,
  } = useSongDetailSidebar()
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleSoulseekSearch = async (
    item: { title: string; artist?: string; thumbnail?: string; type: string; album?: string },
    isTopResult = false
  ) => {
    const songForSidebar: MusicBrainzRecording = {
      id: `${item.artist || 'artist'}-${item.title}`,
      title: item.title,
      artist: item.artist,
      album: item.album || '',
      coverArt: item.thumbnail,
    }
    setSelectedSong(songForSidebar)
    setSidebarLoading(true)
    setSidebarError(null)
    setSoulseekFiles([])

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    setSearchAbortController(abortControllerRef.current)

    try {
      const query = {
        query: isTopResult ? item.title : `${item.artist || ''} ${item.title}`.trim(),
        artist: item.artist,
        song: item.title,
      }

      const searchResponse = await apiClient.startSoulseekSearch(query, abortControllerRef.current.signal)

      if (searchResponse.search_token === null) {
        setSidebarLoading(false)
        setSidebarError('Search failed to start on Soulseek.')
        return
      }

      const token = searchResponse.search_token
      setSidebarSearchQuery(searchResponse.actual_query)

      let isComplete = false
      const pollInterval = setInterval(async () => {
        if (abortControllerRef.current?.signal.aborted) {
          clearInterval(pollInterval)
          return
        }
        try {
          const pollResponse = await apiClient.getSoulseekSearchResults(token)

          const filesWithIds: SoulseekFile[] = pollResponse.results.map((file) => ({
            ...file,
            id: `${file.username}:${file.path}`,
          }))

          setSoulseekFiles(filesWithIds)

          if (pollResponse.is_complete) {
            isComplete = true
            clearInterval(pollInterval)
            setSidebarLoading(false)
          }
        } catch (pollErr) {
          console.error('Polling for search results failed:', pollErr)
          setSidebarError('Failed to fetch search results.')
          clearInterval(pollInterval)
          setSidebarLoading(false)
        }
      }, 2000)

      setTimeout(() => {
        if (!isComplete) {
          clearInterval(pollInterval)
          setSidebarLoading(false)
        }
      }, 30000)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Soulseek search failed:', err)
        setSidebarError('An error occurred during the Soulseek search.')
        setSidebarLoading(false)
      }
    }
  }

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const queryParam = searchParams.get('q')
    if (queryParam) {
      const decodedQuery = decodeURIComponent(queryParam)
      setQuery(decodedQuery)
      performSearch(decodedQuery)
    }
  }, [location.search, performSearch])

  const renderSongs = (songs: any[]) => (
    <div className={styles.songList}>
      {songs.map((song, index) => (
        <div key={index} className={styles.songItem}>
          <img src={song.thumbnail} alt={song.title} className={styles.songThumbnail} />
          <div className={styles.songInfo}>
            <div className={styles.songTitle}>{song.title}</div>
            <div className={styles.songArtist}>{song.artist}</div>
          </div>
          <div className={styles.songDuration}>{song.duration}</div>
          <button
            className={styles.searchButton}
            onClick={() => handleSoulseekSearch(song)}
            title={t('search.searchOnSoulseek')}
          >
            <i className="fa-solid fa-magnifying-glass"></i>
          </button>
        </div>
      ))}
    </div>
  )

  const renderArtists = (artists: any[]) => (
    <div className={styles.artistGrid}>
      {artists.map((artist, index) => (
        <div key={index} className={styles.artistCard}>
          <div className={styles.imageContainer}>
            <img src={artist.thumbnail} alt={artist.title} className={styles.artistImage} />
            <button
              className={styles.searchButton}
              onClick={() => handleSoulseekSearch(artist)}
              title={t('search.searchOnSoulseek')}
            >
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
          </div>
          <div className={styles.artistName}>{artist.title}</div>
          <div className={styles.artistSubtitle}>{artist.type}</div>
        </div>
      ))}
    </div>
  )

  const renderAlbums = (albums: any[]) => (
    <div className={styles.albumGrid}>
      {albums.map((album, index) => (
        <div key={index} className={styles.albumCard}>
          <div className={styles.imageContainer}>
            <img src={album.thumbnail} alt={album.title} className={styles.albumImage} />
            <button
              className={styles.searchButton}
              onClick={() => handleSoulseekSearch(album)}
              title={t('search.searchOnSoulseek')}
            >
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
          </div>
          <div className={styles.albumName}>{album.title}</div>
          <div className={styles.albumArtist}>{album.artist}</div>
        </div>
      ))}
    </div>
  )

  const topResult = searchResults['Top Results']?.[0]
  const songs = searchResults['Songs'] || []
  const artists = searchResults['Artists'] || []
  const albums = searchResults['Albums'] || []

  return (
    <div className={styles.searchContainer}>
      <div className={styles.filters}>
        {['All', 'Artists', 'Songs', 'Albums'].map((filter) => (
          <button
            key={filter}
            className={`${styles.filterButton} ${activeFilter === filter ? styles.activeFilter : ''}`}
            onClick={() => setActiveFilter(filter)}
          >
            {t(`search.${filter.toLowerCase()}`)}
          </button>
        ))}
      </div>

      {isSearching && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
        </div>
      )}
      {searchError && <div className={styles.errorContainer}>{searchError}</div>}

      {!isSearching && !searchError && (
        <div className={styles.results}>
          {activeFilter === 'All' && (
            <>
              {topResult && (
                <div className={styles.topResultAndSongs}>
                  <div className={styles.topResult}>
                    <h2>{t('search.topResult')}</h2>
                    <div className={styles.topResultCard}>
                      <img
                        src={topResult.thumbnail}
                        alt={topResult.title}
                        className={`${styles.topResultImage} ${
                          topResult.type === 'Artist' ? styles.topResultImageArtist : styles.topResultImageAlbum
                        }`}
                      />
                      <div className={styles.topResultTitle}>{topResult.title}</div>
                      <div className={styles.topResultSubtitle}>
                        {topResult.type === 'Song' || topResult.type === 'Album'
                          ? `${topResult.artist}`
                          : topResult.type}
                      </div>
                      <button
                        className={styles.searchButton}
                        onClick={() => handleSoulseekSearch(topResult, true)}
                        title={t('search.searchOnSoulseek')}
                      >
                        <i className="fa-solid fa-magnifying-glass"></i>
                      </button>
                    </div>
                  </div>
                  {songs.length > 0 && (
                    <div className={styles.songsSection}>
                      <h2>{t('search.songs')}</h2>
                      {renderSongs(songs.slice(0, 4))}
                    </div>
                  )}
                </div>
              )}
              {artists.length > 0 && (
                <div className={styles.artistSection}>
                  <h2>{t('search.artists')}</h2>
                  {renderArtists(artists)}
                </div>
              )}
              {albums.length > 0 && (
                <div className={styles.albumSection}>
                  <h2>{t('search.albums')}</h2>
                  {renderAlbums(albums)}
                </div>
              )}
            </>
          )}

          {activeFilter === 'Artists' && artists.length > 0 && (
            <div className={styles.artistSection}>
              <h2>{t('search.artists')}</h2>
              <div className={styles.artistGridFull}>
                {artists.map((artist, index) => (
                  <div key={index} className={styles.artistCard}>
                    <div className={styles.imageContainer}>
                      <img src={artist.thumbnail} alt={artist.title} className={styles.artistImage} />
                      <button
                        className={styles.searchButton}
                        onClick={() => handleSoulseekSearch(artist)}
                        title={t('search.searchOnSoulseek')}
                      >
                        <i className="fa-solid fa-magnifying-glass"></i>
                      </button>
                    </div>
                    <div className={styles.artistName}>{artist.title}</div>
                    <div className={styles.artistSubtitle}>{artist.type}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeFilter === 'Songs' && songs.length > 0 && (
            <div className={styles.songsSection}>
              <h2>{t('search.songs')}</h2>
              {renderSongs(songs)}
            </div>
          )}

          {activeFilter === 'Albums' && albums.length > 0 && (
            <div className={styles.albumSection}>
              <h2>{t('search.albums')}</h2>
              <div className={styles.albumGridFull}>
                {albums.map((album, index) => (
                  <div key={index} className={styles.albumCard}>
                    <div className={styles.imageContainer}>
                      <img src={album.thumbnail} alt={album.title} className={styles.albumImage} />
                      <button
                        className={styles.searchButton}
                        onClick={() => handleSoulseekSearch(album)}
                        title={t('search.searchOnSoulseek')}
                      >
                        <i className="fa-solid fa-magnifying-glass"></i>
                      </button>
                    </div>
                    <div className={styles.albumName}>{album.title}</div>
                    <div className={styles.albumArtist}>{album.artist}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
