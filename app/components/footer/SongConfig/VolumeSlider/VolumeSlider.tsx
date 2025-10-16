import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Slider from '@mui/material/Slider'
import styles from './volumeSlider.module.css'

interface PropsVolumeSlider {
  changeVolume: (volume: number) => void
}

export default function VolumeSlider({ changeVolume }: PropsVolumeSlider) {
  const { t } = useTranslation()
  const [isHovered, setIsHovered] = useState(false)
  const [previousVolume, setPreviousVolume] = useState<number>(50)
  const [currentValue, setCurrentValue] = useState<number>(50)
  const [muted, setMuted] = useState(false)

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  const handleVolume = (event: Event, newValue: number | number[]): void => {
    if (typeof newValue === 'number') {
      setCurrentValue(newValue)
      changeVolume(newValue)

      if (newValue === 0) {
        setMuted(true)
      } else {
        if (muted) {
          setMuted(false)
        }
        setPreviousVolume(newValue)
      }
    }
  }

  const handleMute = (): void => {
    if (!muted) {
      if (currentValue > 0) {
        setPreviousVolume(currentValue)
      }
      setCurrentValue(0)
      changeVolume(0)
      setMuted(true)
    } else {
      const volumeToRestore = Math.max(previousVolume > 0 ? previousVolume : 50, 20)
      setCurrentValue(volumeToRestore)
      changeVolume(volumeToRestore)
      setMuted(false)
    }
  }

  const getVolumeIcon = () => {
    if (muted || currentValue === 0) {
      return (
        <svg
          role="presentation"
          aria-label={t('songConfig.volumeOff')}
          viewBox="0 0 16 16"
          className={styles.volumeIcon}
        >
          <path d="M13.86 5.47a.75.75 0 0 0-1.061 0l-1.47 1.47-1.47-1.47A.75.75 0 0 0 8.8 6.53L10.269 8l-1.47 1.47a.75.75 0 1 0 1.06 1.06l1.47-1.47 1.47 1.47a.75.75 0 0 0 1.06-1.06L12.39 8l1.47-1.47a.75.75 0 0 0 0-1.06"></path>
          <path d="M10.116 1.5A.75.75 0 0 0 8.991.85l-6.925 4a3.64 3.64 0 0 0-1.33 4.967 3.64 3.64 0 0 0 1.33 1.332l6.925 4a.75.75 0 0 0 1.125-.649v-1.906a4.7 4.7 0 0 1-1.5-.694v1.3L2.817 9.852a2.14 2.14 0 0 1-.781-2.92c.187-.324.456-.594.78-.782l5.8-3.35v1.3c.45-.313.956-.55 1.5-.694z"></path>
        </svg>
      )
    } else if (currentValue <= 33) {
      return (
        <svg
          role="presentation"
          aria-label={t('songConfig.volumeLow')}
          viewBox="0 0 16 16"
          className={styles.volumeIcon}
        >
          <path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.64 3.64 0 0 1-1.33-4.967 3.64 3.64 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.14 2.14 0 0 0 0 3.7l5.8 3.35V2.8zm8.683 4.29V5.56a2.75 2.75 0 0 1 0 4.88"></path>
        </svg>
      )
    } else if (currentValue <= 66) {
      return (
        <svg
          role="presentation"
          aria-label={t('songConfig.volumeMedium')}
          viewBox="0 0 16 16"
          className={styles.volumeIcon}
        >
          <path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.64 3.64 0 0 1-1.33-4.967 3.64 3.64 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.14 2.14 0 0 0 0 3.7l5.8 3.35V2.8zm8.683 6.087a4.502 4.502 0 0 0 0-8.474v1.65a3 3 0 0 1 0 5.175z"></path>
        </svg>
      )
    } else {
      return (
        <svg
          role="presentation"
          aria-label={t('songConfig.volumeHigh')}
          viewBox="0 0 16 16"
          className={styles.volumeIcon}
        >
          <path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.64 3.64 0 0 1-1.33-4.967 3.64 3.64 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.14 2.14 0 0 0 0 3.7l5.8 3.35V2.8zm8.683 4.29V5.56a2.75 2.75 0 0 1 0 4.88"></path>
          <path d="M11.5 13.614a5.752 5.752 0 0 0 0-11.228v1.55a4.252 4.252 0 0 1 0 8.127z"></path>
        </svg>
      )
    }
  }

  return (
    <Box width="30%" paddingRight="2%" display="flex">
      <button
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          color: isHovered ? 'var(--pure-white)' : 'var(--primary-white)',
        }}
        className={`btn ${styles.buttonMargins} ${styles.volumeButton}`}
        onClick={handleMute}
        aria-label={muted ? t('songConfig.unmute') : t('songConfig.mute')}
        data-testid="songconfig-speaker-button"
      >
        {getVolumeIcon()}
      </button>

      <Slider
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        size="small"
        min={0}
        max={100}
        step={1}
        defaultValue={50}
        aria-label="Volume"
        valueLabelDisplay="off"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onChange={handleVolume}
        value={currentValue}
        data-testid="songconfig-slider-volume"
        id="songconfig-slider-volume"
        sx={{
          cursor: 'pointer',
          '& .MuiSlider-track': {
            backgroundColor: isHovered ? 'var(--primary-green)' : 'var(--primary-white)',
            height: '4px',
            cursor: 'pointer',
          },
          '& .MuiSlider-thumb': {
            backgroundColor: 'var(--primary-white)',
            width: isHovered ? 12 : 0,
            height: isHovered ? 12 : 0,
            opacity: isHovered ? 1 : 0,
            transition: 'all 0.2s ease-in-out',
            cursor: 'pointer',
            '&:hover, &.Mui-focusVisible': {
              boxShadow: '0px 0px 0px 8px rgba(255, 255, 255, 0.16)',
              width: 12,
              height: 12,
              opacity: 1,
              cursor: 'pointer',
            },
          },
          '& .MuiSlider-valueLabel': {
            color: '#fff',
          },
          '& .MuiSlider-rail': {
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            height: '4px',
            cursor: 'pointer',
          },
        }}
      />
    </Box>
  )
}
