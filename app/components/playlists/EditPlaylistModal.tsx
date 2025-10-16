import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Box, TextField } from '@mui/material'
import styles from './editPlaylistModal.module.css'
import { modalStyle } from '../../styles/mui5/styles'
import { apiClient } from '../../api'
import { Playlist } from '../../types'
import { DEFAULT_PLAYLIST_THUMBNAIL } from '../../utils/constants'

interface EditPlaylistModalProps {
  open: boolean
  onClose: () => void
  playlist: Playlist | null
  onPlaylistUpdated: (updatedPlaylist: Playlist) => void
}

export default function EditPlaylistModal({ open, onClose, playlist, onPlaylistUpdated }: EditPlaylistModalProps) {
  const { t } = useTranslation()
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editThumbnail, setEditThumbnail] = useState('')
  const [_error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (playlist) {
      setEditName(playlist.name)
      setEditDescription(playlist.description)
      setEditThumbnail(playlist.thumbnail)
    }
  }, [playlist])

  const handleUpdatePlaylist = async () => {
    if (!playlist || !editName.trim()) return

    const newThumbnail = editThumbnail.trim() || DEFAULT_PLAYLIST_THUMBNAIL

    try {
      const updatedPlaylist = await apiClient.updatePlaylist(playlist.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        thumbnail: newThumbnail,
      })

      if (updatedPlaylist) {
        onPlaylistUpdated(updatedPlaylist)
        onClose()
      } else {
        setError('Failed to update playlist')
      }
    } catch (err) {
      setError('Failed to update playlist')
      console.error('Failed to update playlist:', err)
    }
  }

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="edit-playlist-modal">
      <Box sx={modalStyle}>
        <div className={styles.modalHeader}>
          <h2>{t('playlistDetail.editModalTitle')}</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        <div className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label>{t('playlists.nameLabel')}</label>
            <TextField
              fullWidth
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              variant="outlined"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  '& fieldset': { borderColor: '#404040' },
                  '&:hover fieldset': { borderColor: '#1db954' },
                  '&.Mui-focused fieldset': { borderColor: '#1db954' },
                },
                '& .MuiInputBase-input': { color: '#fff' },
              }}
            />
          </div>

          <div className={styles.formGroup}>
            <label>{t('playlists.descriptionLabel')}</label>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              variant="outlined"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  '& fieldset': { borderColor: '#404040' },
                  '&:hover fieldset': { borderColor: '#1db954' },
                  '&.Mui-focused fieldset': { borderColor: '#1db954' },
                },
                '& .MuiInputBase-input': { color: '#fff' },
              }}
            />
          </div>

          <div className={styles.formGroup}>
            <label>{t('playlists.thumbnailLabel')}</label>
            <TextField
              fullWidth
              value={editThumbnail}
              onChange={(e) => setEditThumbnail(e.target.value)}
              variant="outlined"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  '& fieldset': { borderColor: '#404040' },
                  '&:hover fieldset': { borderColor: '#1db954' },
                  '&.Mui-focused fieldset': { borderColor: '#1db954' },
                },
                '& .MuiInputBase-input': { color: '#fff' },
              }}
            />
          </div>

          <div className={styles.modalActions}>
            <button onClick={onClose} className={styles.cancelButton}>
              {t('common.cancel')}
            </button>
            <button onClick={handleUpdatePlaylist} className={styles.saveButton} disabled={!editName.trim()}>
              {t('common.save')}
            </button>
          </div>
        </div>
      </Box>
    </Modal>
  )
}
