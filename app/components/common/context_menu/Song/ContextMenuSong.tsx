import { useState, MouseEvent } from 'react'
import InfoPopover from '../../info_popover/InfoPopover'
import { InfoPopoverType } from '../../info_popover/types/infoPopover.types'
import { useNavigate } from 'react-router-dom'
import { t } from 'i18next'
import styles from '../contextMenu.module.css'
import { PropsContextMenuSong } from '../types/contextMenu.types'
import { apiClient } from '../../../../api'

export default function ContextMenuSong({
  songName,
  artistName,
  playlistId,
  handleCloseParent,
  songPath,
}: PropsContextMenuSong) {
  const navigate = useNavigate()

  const urlArtist = `/artist/${artistName}`

  const handleClose = () => {
    handleCloseParent()
  }

  const handleClickGoToArtist = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    navigate(urlArtist)
  }

  const [triggerOpenConfirmationModal, setTriggerOpenConfirmationModal] = useState(false)

  const handleCopyToClipboard = (): void => {
    const songInfoText = `${artistName} - ${songName}`
    window.conveyor.window.copyToClipboard(songInfoText)
    setTriggerOpenConfirmationModal(true)
  }

  const handleDeleteSongFromPlaylist = async () => {
    if (!playlistId || !songPath) return
    try {
      await apiClient.removeSongFromPlaylist(playlistId, songPath)
      handleClose()
    } catch (err) {
      console.error('Failed to delete song:', err)
    }
  }

  return (
    <div className={` ${styles.wrapperContextMenu}`}>
      <ul>
        <li>
          <button type="button" onClick={(e) => handleClickGoToArtist(e)}>
            {t('contextMenu.goToArtist')}
          </button>
        </li>
        <li>
          {playlistId !== '' && (
            <button type="button" onClick={() => handleDeleteSongFromPlaylist()}>
              {t('contextMenu.removeFromPlaylist')}
            </button>
          )}
        </li>
        <li>
          <button type="button" onClick={handleCopyToClipboard}>
            {t('common.share')}
          </button>
        </li>
      </ul>

      <InfoPopover
        type={InfoPopoverType.CLIPBOARD}
        title={t('infoPopover.clipboardTitle')}
        description={t('infoPopover.clipboardDescription')}
        triggerOpenConfirmationModal={triggerOpenConfirmationModal}
        handleClose={handleClose}
      />
    </div>
  )
}
