import React, { useState, useEffect } from 'react'
import styles from './timerBar.module.css'

interface TimerBarProps {
  startTime: number | null
  duration: number | null
}

export default function TimerBar({ startTime, duration }: TimerBarProps) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    if (startTime === null || duration === null) {
      setProgress(0)
      return
    }

    const interval = setInterval(() => {
      const elapsedTime = Date.now() - startTime
      const remainingTime = duration - elapsedTime
      const progressPercentage = (remainingTime / duration) * 100

      if (remainingTime > 0) {
        setProgress(progressPercentage)
      } else {
        setProgress(0)
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime, duration])

  if (startTime === null || duration === null) {
    return null
  }

  return (
    <div className={styles.timerBarContainer}>
      <div className={styles.timerBarProgress} style={{ width: `${progress}%` }} />
    </div>
  )
}
