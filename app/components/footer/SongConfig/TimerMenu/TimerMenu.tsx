import React from 'react'
import { useTranslation } from 'react-i18next'
import styles from './timerMenu.module.css'

interface TimerMenuProps {
  onSelect: (minutes: number | 'custom') => void
  onCancel: () => void
}

export default function TimerMenu({ onSelect, onCancel }: TimerMenuProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.menuContainer}>
      <ul>
        <li onClick={() => onSelect(15)}>{t('timer.minutes', { count: 15 })}</li>
        <li onClick={() => onSelect(30)}>{t('timer.minutes', { count: 30 })}</li>
        <li onClick={() => onSelect(60)}>{t('timer.hour', { count: 1 })}</li>
        <li onClick={() => onSelect(120)}>{t('timer.hour', { count: 2 })}</li>
        <li onClick={() => onSelect('custom')}>{t('timer.custom')}</li>
        <li onClick={onCancel} className={styles.cancelOption}>
          {t('common.cancel')}
        </li>
      </ul>
    </div>
  )
}
