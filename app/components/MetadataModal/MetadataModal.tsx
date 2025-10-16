import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './metadataModal.module.css'

interface MetadataModalProps {
  isOpen: boolean
  fileName: string
  onSave: (metadata: { title: string; artist: string }) => void
  onCancel: () => void
}

export default function MetadataModal({ isOpen, fileName, onSave, onCancel }: MetadataModalProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')

  useEffect(() => {
    if (isOpen && fileName) {
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '')

      const parts = nameWithoutExt.split(' - ')
      if (parts.length >= 2) {
        setArtist(parts[0].trim())
        setTitle(parts.slice(1).join(' - ').trim())
      } else {
        setTitle(nameWithoutExt.trim())
        setArtist('')
      }
    }
  }, [isOpen, fileName])

  const handleSave = () => {
    if (title.trim()) {
      onSave({
        title: title.trim(),
        artist: artist.trim(),
      })

      setTitle('')
      setArtist('')
    }
  }

  const handleCancel = () => {
    onCancel()

    setTitle('')
    setArtist('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>{t('metadataModal.title')}</h2>

        <div className={styles.fileName}>
          <i className="fa-solid fa-music"></i>
          <span>{fileName}</span>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="songTitle">{t('metadataModal.songTitle')}</label>
          <input
            id="songTitle"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('metadataModal.songTitlePlaceholder')}
            autoFocus
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="artistName">{t('metadataModal.artistName')}</label>
          <input
            id="artistName"
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('metadataModal.artistNamePlaceholder')}
          />
        </div>

        <div className={styles.modalActions}>
          <button className={styles.cancelButton} onClick={handleCancel}>
            {t('common.cancel')}
          </button>
          <button className={styles.saveButton} onClick={handleSave} disabled={!title.trim()}>
            {t('metadataModal.addToLibrary')}
          </button>
        </div>
      </div>
    </div>
  )
}
