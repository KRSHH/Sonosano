import Modal from '@mui/material/Modal'
import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import PriorityHighIcon from '@mui/icons-material/PriorityHigh'
import CheckIcon from '@mui/icons-material/Check'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import { t } from 'i18next'
import { PropsInfoPopover, InfoPopoverType } from './types/infoPopover.types'
import styles from './confirmationModal.module.css'

export default function InfoPopover({
  title,
  description,
  type,
  triggerOpenConfirmationModal,
  handleClose,
}: PropsInfoPopover) {
  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '50svw',
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 2,
  }

  const [openConfirmationModal, setOpenConfirmationModal] = useState(false)

  const handleCloseConfirmationModal = () => {
    setOpenConfirmationModal(false)
    if (handleClose) {
      handleClose()
    }
  }

  useEffect(() => {
    if (triggerOpenConfirmationModal) {
      setOpenConfirmationModal(true)
    }
  }, [triggerOpenConfirmationModal])

  return (
    <div>
      <Modal
        open={openConfirmationModal}
        onClose={handleCloseConfirmationModal}
        aria-labelledby="modal-modal-confirmation"
        aria-describedby="modal-modal-confirmation-description"
        style={{ zIndex: '99999' }}
      >
        <Box sx={style} className={`${styles.wrapperConfirmationModal}`}>
          <div className={`${styles.wrapperConfirmationModalHeader}`}>
            <div className={`${styles.wrapperConfirmationModalText}`}>
              <span>{title}</span>
              <p>{description}</p>
            </div>

            <div className="d-flex container-fluid align-items-center justify-content-end">
              {type === InfoPopoverType.SUCCESS && (
                <CheckIcon
                  style={{
                    color: 'var(--secondary-green)',
                    fontSize: '6rem',
                  }}
                />
              )}

              {type === InfoPopoverType.ERROR && (
                <PriorityHighIcon
                  style={{
                    color: 'var(--secondary-green)',
                    fontSize: '6rem',
                  }}
                />
              )}

              {type === InfoPopoverType.CLIPBOARD && (
                <ContentPasteIcon
                  style={{
                    color: 'var(--secondary-green)',
                    fontSize: '6rem',
                  }}
                />
              )}
            </div>
          </div>
          <div className={`container-fluid d-flex flex-column justify-content-flex-end mt-4 ${styles.wrapperButton}`}>
            <button type="button" onClick={handleCloseConfirmationModal} id="button-info-popover">
              {t('common.confirm')}
            </button>
          </div>
        </Box>
      </Modal>
    </div>
  )
}
