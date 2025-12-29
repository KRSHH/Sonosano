import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePlaybackManager } from '../../../hooks/usePlaybackManager'
import { apiClient } from '../../../api'
import styles from './songConfig.module.css'
import VolumeSlider from './VolumeSlider/VolumeSlider'
import TimerMenu from './TimerMenu/TimerMenu'
import TimePicker from './TimePicker/TimePicker'
import { systemAdapter } from '@/app/lib/systemAdapter'

interface PropsSongConfig {
  changeVolume: (volume: number) => void
  setTimerState: (startTime: number | null, duration: number | null) => void
}

export default function SongConfig({ changeVolume, setTimerState }: PropsSongConfig) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [isTimerMenuOpen, setIsTimerMenuOpen] = useState(false)
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false)
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null)

  const { playbackManager, playbackState } = usePlaybackManager()
  const { currentSong, isPlaying } = playbackState

  const handleFullScreen = (): void => {
    systemAdapter.window.toggleFullscreen()
  }

  const handleShowInExplorer = async (): Promise<void> => {
    if (currentSong?.path) {
      try {
        await apiClient.showInExplorer(currentSong.path)
      } catch (err) {
        console.error('Failed to show in explorer:', err)
      }
    }
  }

  const handleShowLyrics = (): void => {
    navigate('/lyrics')
  }

  const handleTimer = (): void => {
    setIsTimerMenuOpen(!isTimerMenuOpen)
  }

  const handleTimerSelect = (minutes: number | 'custom') => {
    setIsTimerMenuOpen(false)
    if (minutes === 'custom') {
      setIsTimePickerOpen(true)
    } else {
      setSleepTimer(minutes, isPlaying)
    }
  }

  const handleTimePickerSave = (hours: number, minutes: number) => {
    setIsTimePickerOpen(false)
    const totalMinutes = hours * 60 + minutes
    setSleepTimer(totalMinutes, isPlaying)
  }

  const setSleepTimer = (minutes: number, isPlayingState: boolean) => {
    if (timer) {
      clearTimeout(timer)
    }
    const durationMs = minutes * 60 * 1000
    const startTime = Date.now()
    const newTimer = setTimeout(() => {
      if (playbackManager && isPlayingState) {
        playbackManager.pause()
      }
      setTimerState(null, null)
    }, durationMs)
    setTimer(newTimer)
    setTimerState(startTime, durationMs)
  }

  const cancelTimer = () => {
    if (timer) {
      clearTimeout(timer)
      setTimer(null)
      setTimerState(null, null)
    }
    setIsTimerMenuOpen(false)
  }

  return (
    <div className={`d-flex container-fluid justify-content-end ${styles.settingsContainer} `}>
      <button
        type="button"
        onClick={handleShowInExplorer}
        data-testid="control-button-npv"
        data-active="false"
        aria-pressed="false"
        data-restore-focus-key="now_playing_view"
        aria-label={t('songConfig.showInExplorer')}
        className="btn"
        disabled={!currentSong?.path}
      >
        <span aria-hidden="true">
          <svg role="img" aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
            <path d="M11.196 8 6 5v6z"></path>
            <path d="M15.002 1.75A1.75 1.75 0 0 0 13.252 0h-10.5a1.75 1.75 0 0 0-1.75 1.75v12.5c0 .966.783 1.75 1.75 1.75h10.5a1.75 1.75 0 0 0 1.75-1.75zm-1.75-.25a.25.25 0 0 1 .25.25v12.5a.25.25 0 0 1-.25.25h-10.5a.25.25 0 0 1-.25-.25V1.75a.25.25 0 0 1 .25-.25z"></path>
          </svg>
        </span>
      </button>
      <button
        type="button"
        onClick={handleShowLyrics}
        data-testid="lyrics-button"
        data-active="false"
        aria-pressed="false"
        aria-label={t('songConfig.lyrics')}
        className={`btn ${location.pathname === '/lyrics' ? styles.active : ''}`}
        disabled={!currentSong?.path}
      >
        <span aria-hidden="true">
          <svg
            role="img"
            aria-hidden="true"
            viewBox="0 0 16 16"
            width="16"
            height="16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13.426 2.574a2.831 2.831 0 0 0-4.797 1.55l3.247 3.247a2.831 2.831 0 0 0 1.55-4.797M10.5 8.118l-2.619-2.62L4.74 9.075 2.065 12.12a1.287 1.287 0 0 0 1.816 1.816l3.06-2.688 3.56-3.129zM7.12 4.094a4.331 4.331 0 1 1 4.786 4.786l-3.974 3.493-3.06 2.689a2.787 2.787 0 0 1-3.933-3.933l2.676-3.045z"
              fill="currentColor"
            ></path>
          </svg>
        </span>
      </button>
      <div className={styles.timerButtonContainer}>
        <button
          type="button"
          onClick={handleTimer}
          data-testid="timer-button"
          data-active="false"
          aria-pressed="false"
          aria-label={t('songConfig.sleepTimer')}
          className="btn"
        >
          <span aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="13" r="9" />
              <path d="M12 8v5" />
              <path d="M10 1h4" />
              <path d="M12 1v2" />
            </svg>
          </span>
        </button>
        {isTimerMenuOpen && (
          <div className={styles.timerMenuWrapper}>
            <TimerMenu onSelect={handleTimerSelect} onCancel={cancelTimer} />
          </div>
        )}
      </div>
      {isTimePickerOpen && <TimePicker onSave={handleTimePickerSave} onClose={() => setIsTimePickerOpen(false)} />}
      <VolumeSlider changeVolume={changeVolume} />
      <button
        type="button"
        onClick={handleFullScreen}
        data-testid="fullscreen-mode-button"
        data-active="false"
        aria-pressed="false"
        aria-label={t('songConfig.fullscreen')}
        className="btn"
      >
        <span aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0.25 3C0.25 2.0335 1.0335 1.25 2 1.25H5.375V2.75H2C1.86193 2.75 1.75 2.86193 1.75 3V5.42857H0.25V3ZM14 2.75H10.625V1.25H14C14.9665 1.25 15.75 2.0335 15.75 3V5.42857H14.25V3C14.25 2.86193 14.1381 2.75 14 2.75ZM1.75 10.5714V13C1.75 13.1381 1.86193 13.25 2 13.25H5.375V14.75H2C1.0335 14.75 0.25 13.9665 0.25 13V10.5714H1.75ZM14.25 13V10.5714H15.75V13C15.75 13.9665 14.9665 14.75 14 14.75H10.625V13.25H14C14.1381 13.25 14.25 13.1381 14.25 13Z"
              fill="currentColor"
            />
          </svg>
        </span>
      </button>
    </div>
  )
}
