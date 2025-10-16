import React from 'react'
import { useSystemStatus } from '../../hooks/useDownloads'
import styles from './systemStatusIndicator.module.css'
import { useTranslation } from 'react-i18next'

const SystemStatusIndicator: React.FC = () => {
  const { data: systemStatus, isLoading } = useSystemStatus()
  const { t } = useTranslation()

  const getStatusInfo = () => {
    if (isLoading || !systemStatus) {
      return {
        className: styles.offline,
        tooltip: t('systemStatus.loading'),
      }
    }

    // 1. Red when there is no backend
    if (systemStatus.backend_status !== 'Online') {
      return {
        className: styles.offline,
        tooltip: t('systemStatus.backendOffline'),
      }
    }

    // 2. Yellow when backend is on but soulseek is not connected
    if (systemStatus.soulseek_status !== 'Connected') {
      return {
        className: styles.connecting, // Yellow
        tooltip: t('systemStatus.soulseekConnecting'),
      }
    }

    // 4. Blue when backend is on and soulseek is connected and there are active transfers
    if (systemStatus.active_downloads > 0 || systemStatus.active_uploads > 0) {
      return {
        className: styles.transferring, // Blue
        tooltip: t('systemStatus.transferringData', {
          downloads: systemStatus.active_downloads,
          uploads: systemStatus.active_uploads,
        }),
      }
    }

    // 3. Green when backend is on and soulseek is connected but no active transfers
    return {
      className: styles.online, // Green
      tooltip: t('systemStatus.online', {
        username: systemStatus.soulseek_username,
      }),
    }
  }

  const { className, tooltip } = getStatusInfo()

  return (
    <div className={`${styles.statusIndicator} ${className}`} title={tooltip}>
      <div className={styles.centerDot} />
      <div className={styles.radarPing} />
    </div>
  )
}

export default SystemStatusIndicator
