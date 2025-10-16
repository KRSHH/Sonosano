import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './timePicker.module.css'

interface TimePickerProps {
  onSave: (hours: number, minutes: number) => void
  onClose: () => void
}

export default function TimePicker({ onSave, onClose }: TimePickerProps) {
  const { t } = useTranslation()
  const [hour, setHour] = useState(0)
  const [minute, setMinute] = useState(0)

  const handleSave = () => {
    onSave(hour, minute)
  }

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 2)
    let numValue = parseInt(value, 10)
    if (isNaN(numValue) || numValue < 0) numValue = 0
    if (numValue > 23) numValue = 23
    setHour(numValue)
  }

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 2)
    let numValue = parseInt(value, 10)
    if (isNaN(numValue) || numValue < 0) numValue = 0
    if (numValue > 59) numValue = 59
    setMinute(numValue)
  }

  const incrementHour = () => setHour((h) => (h >= 23 ? 0 : h + 1))
  const decrementHour = () => setHour((h) => (h <= 0 ? 23 : h - 1))
  const incrementMinute = () => setMinute((m) => (m >= 59 ? 0 : m + 1))
  const decrementMinute = () => setMinute((m) => (m <= 0 ? 59 : m - 1))

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{t('timer.setTimer')}</h2>
          <button onClick={onClose} className={styles.closeButton}>
            &times;
          </button>
        </div>

        <div className={styles.timeDisplayContainer}>
          <div className={styles.timeInputWrapper}>
            <button onClick={incrementHour} className={`${styles.arrow} ${styles.upArrow}`}>
              &#9650;
            </button>
            <input
              type="text"
              value={hour.toString().padStart(2, '0')}
              onChange={handleHourChange}
              className={styles.timeInput}
              readOnly
            />
            <button onClick={decrementHour} className={`${styles.arrow} ${styles.downArrow}`}>
              &#9660;
            </button>
          </div>

          <span className={styles.separator}>:</span>

          <div className={styles.timeInputWrapper}>
            <button onClick={incrementMinute} className={`${styles.arrow} ${styles.upArrow}`}>
              &#9650;
            </button>
            <input
              type="text"
              value={minute.toString().padStart(2, '0')}
              onChange={handleMinuteChange}
              className={styles.timeInput}
              readOnly
            />
            <button onClick={decrementMinute} className={`${styles.arrow} ${styles.downArrow}`}>
              &#9660;
            </button>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            onClick={handleSave}
            className={styles.saveButton}
            style={{
              backgroundColor: 'white',
              color: 'black',
              fontWeight: 300,
              padding: '12px 64px',
            }}
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
