import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import styles from './songInfo.module.css'
import { usePlaybackManager } from '../../../hooks/usePlaybackManager'
import AddToPlaylistMenu from '../AddToPlaylistMenu/AddToPlaylistMenu'
import { Song } from '../../../types'

interface SongInfoProps {
  name: string
  metadata?: Song['metadata']
}

export default function SongInfo({ name, metadata }: SongInfoProps) {
  const { t } = useTranslation()
  const artist = metadata?.artist
  const thumbnail = metadata?.coverArt
  const navigate = useNavigate()
  const { playbackState } = usePlaybackManager()
  const { currentSong } = playbackState

  const [imageError, setImageError] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleAddToPlaylistClick = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleClose = () => {
    setIsMenuOpen(false)
  }

  const handleClickArtist = () => {
    navigate(`/artist/${artist}`)
  }

  useEffect(() => {
    setImageError(false)
  }, [thumbnail])

  return (
    <div
      className={`d-flex flex-row justify-content-start container-fluid ${styles.songInfoContainer}`}
      data-song-info="true"
    >
      {name && (
        <>
          <div className={styles.thumbnailContainer}>
            {imageError || !thumbnail ? (
              <div className={styles.thumbnailPlaceholder}>
                <i className="fa-solid fa-music"></i>
              </div>
            ) : (
              <img
                key={`${name}-${artist}-${thumbnail}`}
                src={thumbnail}
                alt="song thumbnail"
                data-song-thumbnail="true"
                onError={() => setImageError(true)}
              />
            )}
          </div>
          <div className={`d-flex flex-column ${styles.songDetailsContainer}`}>
            <button data-testid="songinfo-name" data-song-name="true" type="button">
              {name}
            </button>
            <button type="button" onClick={handleClickArtist} data-song-artist="true">
              {artist}
            </button>
          </div>
          <div className={`d-flex flex-column ${styles.likeContainer} ${styles.menuWrapper}`}>
            {currentSong && (
              <>
                {isMenuOpen && (
                  <div className={styles.menuContainer}>
                    <AddToPlaylistMenu song={currentSong} onClose={handleClose} />
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleAddToPlaylistClick}
                  className={`btn ${styles.addButton}`}
                  aria-label={t('footer.addToPlaylist')}
                  data-testid="add-to-playlist-button"
                >
                  <svg role="img" aria-hidden="true" viewBox="0 0 16 16">
                    <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8"></path>
                    <path d="M11.75 8a.75.75 0 0 1-.75.75H8.75V11a.75.75 0 0 1-1.5 0V8.75H5a.75.75 0 0 1 0-1.5h2.25V5a.75.75 0 0 1 1.5 0v2.25H11a.75.75 0 0 1 .75.75"></path>
                  </svg>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
