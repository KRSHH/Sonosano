import { useTranslation } from 'react-i18next'
import * as styles from './songDetailSidebar.module.css'
import { formatDuration } from '../../utils/format'
import { useSongDetailSidebar } from '../../providers/SongDetailSidebarProvider'

const SongDetailSidebar = () => {
  const { t } = useTranslation()
  const { selectedSong, setSelectedSong } = useSongDetailSidebar()

  const onClose = () => {
    setSelectedSong(null)
  }

  if (!selectedSong) {
    return null
  }

  return (
    <div className={styles.sidebarContainer}>
      <button
        className={styles.closeButton}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
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
    </div>
  )
}

export default SongDetailSidebar
