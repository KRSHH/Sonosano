import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSongSearch } from '../hooks/useSongSearch'
import { useSearchTabs } from '../../../providers/SearchTabProvider'
import styles from '../search.module.css'
import { MusicBrainzRecording } from '../../../types'

interface RichResultsViewProps {
  query: string
}

export default function RichResultsView({ query }: RichResultsViewProps) {
  const { t } = useTranslation()
  const [activeFilter, setActiveFilter] = useState('All')
  const { searchResults, isSearching, searchError } = useSongSearch(query)
  const { addTab } = useSearchTabs()

  const handleSoulseekSearch = (item: {
    title: string
    artist?: string
    thumbnail?: string
    type: string
    album?: string
  }) => {
    const metadata: MusicBrainzRecording = {
      id: `${item.artist || 'artist'}-${item.title}`,
      title: item.title,
      artist: item.artist,
      album: item.album || '',
      coverArt: item.thumbnail,
    }

    addTab({
      type: 'SOULSEEK_RESULTS',
      title: `Soulseek: ${item.title}`,
      metadata,
    })
  }

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
    <div>
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
                        onClick={() => handleSoulseekSearch(topResult)}
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