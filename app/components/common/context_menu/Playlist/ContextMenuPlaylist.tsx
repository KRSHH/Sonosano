import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import InfoPopover from '../../info_popover/InfoPopover'
import { InfoPopoverType } from '../../info_popover/types/infoPopover.types'
import { t } from 'i18next'
import styles from '../contextMenu.module.css'
import { PropsContextMenuPlaylist } from '../types/contextMenu.types'
import { apiClient } from '../../../../api'

interface ConfirmationMenuData {
  title: string
  type: InfoPopoverType
  description: string
}

export default function ContextMenuPlaylist({ playlistId, handleCloseParent, onDelete }: PropsContextMenuPlaylist) {
  const navigate = useNavigate()

  const [confirmationData, setConfirmationData] = useState<ConfirmationMenuData | null>(null)

  const [triggerOpenConfirmationModal, setTriggerOpenConfirmationModal] = useState(false)

  const displayConfirmationModal = (type: InfoPopoverType, title: string, description: string) => {
    setConfirmationData({ type, title, description })
    setTriggerOpenConfirmationModal(true)
  }

  const handleDeletePlaylist = async () => {
    try {
      await apiClient.deletePlaylist(playlistId)
      displayConfirmationModal(
        InfoPopoverType.SUCCESS,
        t('contextMenu.deleteSuccessTitle'),
        t('contextMenu.deleteSuccessDescription')
      )
      if (onDelete) {
        onDelete()
      }
    } catch (err) {
      console.error(err)
      displayConfirmationModal(
        InfoPopoverType.ERROR,
        t('contextMenu.deleteErrorTitle'),
        t('contextMenu.deleteErrorDescription')
      )
    } finally {
      handleCloseParent()
    }
  }

  const handleEditPlaylistData = () => {
    navigate(`/playlists/${playlistId}?edit=true`, { replace: true })

    handleCloseParent()
  }

  const handleClose = () => {
    setTriggerOpenConfirmationModal(false)
    handleCloseParent()
  }

  return (
    <div className={` ${styles.wrapperContextMenu}`}>
      <ul>
        <li>
          <button type="button" onClick={handleEditPlaylistData}>
            <i className="fa-solid fa-edit" style={{ marginRight: '8px' }} />
            {t('contextMenu.editPlaylist')}
          </button>
        </li>
        <li>
          <button type="button" style={{ color: '#e22134' }} onClick={handleDeletePlaylist}>
            <i className="fa-solid fa-trash" style={{ marginRight: '8px' }} />
            {t('contextMenu.deletePlaylist')}
          </button>
        </li>
      </ul>

      {confirmationData && (
        <InfoPopover
          type={confirmationData.type}
          title={confirmationData.title}
          description={confirmationData.description}
          triggerOpenConfirmationModal={triggerOpenConfirmationModal}
          handleClose={handleClose}
        />
      )}
    </div>
  )
}
