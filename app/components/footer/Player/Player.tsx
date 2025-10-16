import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlaybackManager } from '../../../hooks/usePlaybackManager'
import styles from './player.module.css'
import TimeSlider from './TimeSlider/TimeSlider'
import { PropsPlayer } from './types/Player.types'

export default function Player({ volume, changeSongInfo }: PropsPlayer) {
  const { t } = useTranslation()
  const { playbackManager, playbackState } = usePlaybackManager()
  const { isPlaying, currentTime, duration, currentSong, isShuffle, isLoop } = playbackState

  useEffect(() => {
    playbackManager.setVolume(volume)
  }, [volume, playbackManager])

  useEffect(() => {
    if (currentSong) {
      changeSongInfo(currentSong)
    }
  }, [currentSong, changeSongInfo])

  const handlePlayPause = () => {
    if (isPlaying) {
      playbackManager.pause()
    } else {
      playbackManager.resume()
    }
  }

  const handleSeek = (time: number) => {
    playbackManager.seek(time)
  }

  const handleShuffle = () => {
    playbackManager.toggleShuffle()
  }

  const handleLoop = () => {
    playbackManager.toggleLoop()
  }

  return (
    <div className={`d-flex container-fluid flex-column ${styles.playerBarContainer}`}>
      <div className={`d-flex container-fluid flex-row ${styles.buttonsPlayerContainer}`}>
        <button
          type="button"
          role="switch"
          aria-checked={isShuffle}
          data-testid="control-button-shuffle"
          aria-label={t('player.shuffle')}
          onClick={handleShuffle}
          className={isShuffle ? styles.active : ''}
        >
          <svg role="img" aria-hidden="true" viewBox="0 0 16 16">
            <path d="M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.5H0V14h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-.804h1.947l-1.017 1.018a.75.75 0 0 0 1.06 1.06L15.98 3.75zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.979 1.167-1.796-2.14A2.25 2.25 0 0 0 .39 3.5z"></path>
            <path d="m7.5 10.723.98-1.167.957 1.14a2.25 2.25 0 0 0 1.724.804h1.947l-1.017-1.018a.75.75 0 1 1 1.06-1.06l2.829 2.828-2.829 2.828a.75.75 0 1 1-1.06-1.06L13.109 13H11.16a3.75 3.75 0 0 1-2.873-1.34l-.787-.938z"></path>
          </svg>
        </button>
        <button
          type="button"
          data-testid="control-button-skip-back"
          aria-label={t('player.previous')}
          onClick={() => playbackManager.playPrevious()}
        >
          <svg role="img" aria-hidden="true" viewBox="0 0 16 16">
            <path d="M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v12.575a.7.7 0 0 1-1.05.607L4 9.149V14.3a.7.7 0 0 1-.7.7H1.7a.7.7 0 0 1-.7-.7V1.7a.7.7 0 0 1 .7-.7z"></path>
          </svg>
        </button>
        <button
          type="button"
          onClick={handlePlayPause}
          className={`${styles.playButton}`}
          data-testid="control-button-playpause"
          aria-label={isPlaying ? t('common.pause') : t('common.play')}
        >
          {isPlaying ? (
            <svg role="img" aria-hidden="true" viewBox="0 0 16 16">
              <path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z"></path>
            </svg>
          ) : (
            <svg role="img" aria-hidden="true" viewBox="0 0 16 16">
              <path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288z"></path>
            </svg>
          )}
        </button>
        <button
          type="button"
          data-testid="control-button-skip-forward"
          aria-label={t('player.next')}
          onClick={() => playbackManager.playNext()}
        >
          <svg role="img" aria-hidden="true" viewBox="0 0 16 16">
            <path d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.107A.7.7 0 0 0 1 1.712v12.575a.7.7 0 0 0 1.05.607L12 9.149V14.3a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7z"></path>
          </svg>
        </button>
        <button
          type="button"
          role="checkbox"
          aria-checked={isLoop}
          data-testid="control-button-repeat"
          aria-label={t('player.repeat')}
          onClick={handleLoop}
          className={isLoop ? styles.active : ''}
        >
          <svg role="img" aria-hidden="true" viewBox="0 0 16 16">
            <path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75z"></path>
          </svg>
        </button>
      </div>

      <TimeSlider
        playBackTime={currentTime}
        initialSongDuration={duration}
        changePlayBackTime={handleSeek}
        isPlaying={isPlaying}
      />
    </div>
  )
}
