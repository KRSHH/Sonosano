import { useState, useEffect, useRef, useCallback } from 'react'
import { formatDuration } from '../../../../utils/format'
import styles from './timeSlider.module.css'

interface PropsTimeSlider {
  playBackTime: number
  initialSongDuration: number
  changePlayBackTime: (playBackTime: number) => void
  isPlaying: boolean
}

export default function TimeSlider({ playBackTime, initialSongDuration, changePlayBackTime }: PropsTimeSlider) {
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const progressBarRef = useRef<HTMLDivElement | null>(null)
  const thumbRef = useRef<HTMLDivElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const songDuration = initialSongDuration || 0
  const songDurationMinutesSeconds = formatDuration(songDuration)
  const songPlayBackTimeMinutesSeconds = formatDuration(playBackTime)

  useEffect(() => {
    if (!isDragging && songDuration > 0) {
      const progress = Math.max(0, Math.min(1, playBackTime / songDuration))
      const progressPercent = progress.toString()
      if (progressBarRef.current) {
        progressBarRef.current.style.setProperty('--progress-percent', progressPercent)
      }
      if (thumbRef.current) {
        thumbRef.current.style.setProperty('--progress-percent', progressPercent)
      }
    }
  }, [playBackTime, songDuration, isDragging])

  const handleSeek = useCallback(
    (e: MouseEvent | React.MouseEvent<HTMLDivElement>): number | undefined => {
      if (!wrapperRef.current || songDuration === 0) return

      const rect = wrapperRef.current.getBoundingClientRect()
      const clickPositionX = e.clientX - rect.left
      const width = rect.width
      const seekFraction = Math.max(0, Math.min(1, clickPositionX / width))
      const newTime = seekFraction * songDuration

      const progressPercent = seekFraction.toString()
      if (progressBarRef.current) {
        progressBarRef.current.style.setProperty('--progress-percent', progressPercent)
      }
      if (thumbRef.current) {
        thumbRef.current.style.setProperty('--progress-percent', progressPercent)
      }

      return newTime
    },
    [songDuration]
  )

  const handleMouseDown = useCallback(() => {
    setIsDragging(true)

    const handleMouseMove = (event: MouseEvent) => {
      handleSeek(event)
    }

    const handleMouseUp = (event: MouseEvent) => {
      const finalTime = handleSeek(event)
      if (finalTime !== undefined) {
        changePlayBackTime(finalTime)
      }
      setIsDragging(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [handleSeek, changePlayBackTime])

  return (
    <div className={styles.sliderContainer}>
      <p className={styles.pSlider}>{songPlayBackTimeMinutesSeconds}</p>

      <div
        className={`${styles.progressBarWrapper} ${isHovered || isDragging ? styles.hovered : ''}`}
        ref={wrapperRef}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={styles.progressBarBackground}>
          <div
            className={styles.progressBarForeground}
            ref={progressBarRef}
            style={{ '--progress-percent': '0' } as React.CSSProperties}
          />
        </div>
        <div
          className={styles.progressBarThumb}
          ref={thumbRef}
          style={{ '--progress-percent': '0' } as React.CSSProperties}
        />
      </div>

      <p className={styles.pSlider}>{songDurationMinutesSeconds}</p>
    </div>
  )
}
