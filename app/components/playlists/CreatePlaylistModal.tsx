import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Box, TextField } from '@mui/material'
import styles from './createPlaylistModal.module.css'
import { modalStyle } from '../../styles/mui5/styles'
import { apiClient } from '../../api'
import { DEFAULT_PLAYLIST_THUMBNAIL } from '../../utils/constants'

interface CreatePlaylistModalProps {
  open: boolean
  onClose: () => void
  onPlaylistCreated: () => void
}

export default function CreatePlaylistModal({ open, onClose, onPlaylistCreated }: CreatePlaylistModalProps) {
  const { t } = useTranslation()
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('')
  const [newPlaylistThumbnail, setNewPlaylistThumbnail] = useState('')
  const [_error, setError] = useState<string | null>(null)

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      return
    }
    try {
      await apiClient.createPlaylist(
        newPlaylistName.trim(),
        newPlaylistDescription.trim(),
        newPlaylistThumbnail.trim() || DEFAULT_PLAYLIST_THUMBNAIL
      )
      onPlaylistCreated()
      handleClose()
    } catch (err) {
      setError('Failed to create playlist')
      console.error('Failed to create playlist:', err)
    }
  }

  const handleClose = () => {
    setNewPlaylistName('')
    setNewPlaylistDescription('')
    setNewPlaylistThumbnail('')
    setError(null)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="create-playlist-modal"
      aria-describedby="create-playlist-form"
    >
      <Box sx={modalStyle}>
        <div className={styles.modalHeader}>
          <h2>{t('playlists.createModalTitle')}</h2>
          <button onClick={handleClose} className={styles.closeButton}>
            <i className="fa-solid fa-times" />
          </button>
        </div>

        <div className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label>{t('playlists.nameLabel')}</label>
            <TextField
              fullWidth
              placeholder={t('playlists.namePlaceholder')}
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              variant="outlined"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  borderRadius: '500px',
                  '& fieldset': {
                    border: 'none',
                  },
                  '&:hover fieldset': {
                    border: 'none',
                  },
                  '&.Mui-focused fieldset': {
                    border: 'none',
                    outline: 'none',
                  },
                  '&.Mui-focused': {
                    outline: 'none',
                    boxShadow: 'none',
                  },
                },
                '& .MuiInputBase-input': {
                  color: '#fff',
                  outline: 'none',
                },
                '& .MuiInputBase-input::placeholder': {
                  color: '#999',
                  opacity: 1,
                },
              }}
            />
          </div>

          <div className={styles.formGroup}>
            <label>{t('playlists.descriptionLabel')}</label>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder={t('playlists.descriptionPlaceholder')}
              value={newPlaylistDescription}
              onChange={(e) => setNewPlaylistDescription(e.target.value)}
              variant="outlined"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  borderRadius: '20px',
                  '& fieldset': {
                    border: 'none',
                  },
                  '&:hover fieldset': {
                    border: 'none',
                  },
                  '&.Mui-focused fieldset': {
                    border: 'none',
                    outline: 'none',
                  },
                  '&.Mui-focused': {
                    outline: 'none',
                    boxShadow: 'none',
                  },
                },
                '& .MuiInputBase-input': {
                  color: '#fff',
                  outline: 'none',
                },
                '& .MuiInputBase-inputMultiline': {
                  color: '#fff',
                  outline: 'none',
                },
                '& .MuiInputBase-input::placeholder': {
                  color: '#999',
                  opacity: 1,
                },
              }}
            />
          </div>

          <div className={styles.formGroup}>
            <label>{t('playlists.thumbnailLabel')}</label>
            <TextField
              fullWidth
              placeholder={t('playlists.thumbnailPlaceholder')}
              value={newPlaylistThumbnail}
              onChange={(e) => setNewPlaylistThumbnail(e.target.value)}
              variant="outlined"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  borderRadius: '500px',
                  '& fieldset': {
                    border: 'none',
                  },
                  '&:hover fieldset': {
                    border: 'none',
                  },
                  '&.Mui-focused fieldset': {
                    border: 'none',
                    outline: 'none',
                  },
                  '&.Mui-focused': {
                    outline: 'none',
                    boxShadow: 'none',
                  },
                },
                '& .MuiInputBase-input': {
                  color: '#fff',
                  outline: 'none',
                },
                '& .MuiInputBase-input::placeholder': {
                  color: '#999',
                  opacity: 1,
                },
              }}
            />
          </div>

          <div className={styles.modalActions}>
            <button onClick={handleClose} className={styles.cancelButton}>
              {t('common.cancel')}
            </button>
            <button onClick={handleCreatePlaylist} className={styles.saveButton} disabled={!newPlaylistName.trim()}>
              {t('playlists.create')}
            </button>
          </div>
        </div>
      </Box>
    </Modal>
  )
}
