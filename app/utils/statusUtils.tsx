import { DownloadItem } from '../types'
import styles from '../components/RecentlyPlayed/recentlyPlayed.module.css'

export const getStatusIcon = (_status: DownloadItem['status']) => {}

export const getStatusColor = (status: DownloadItem['status'] | string) => {
  switch (status) {
    case 'queued':
    case 'Queued':
      return styles.statusQueued
    case 'downloading':
    case 'Transferring':
      return styles.statusDownloading
    case 'completed':
    case 'Finished':
      return styles.statusCompleted
    case 'failed':
    case 'Error':
    case 'Connection timeout':
    case 'Connection closed':
    case 'User logged off':
      return styles.statusFailed
    case 'paused':
    case 'Paused':
      return styles.statusPaused
    default:
      return ''
  }
}

export const getStatusMessageKey = (status: string): string => {
  switch (status) {
    case 'Queued':
      return 'status.queued'
    case 'Transferring':
      return 'status.downloading'
    case 'Finished':
      return 'status.completed'
    case 'Paused':
      return 'status.paused'
    case 'Cancelled':
      return 'status.cancelled'
    case 'Error':
    case 'Connection timeout':
    case 'Connection closed':
    case 'User logged off':
      return 'status.failed'
    case 'Getting status':
      return 'status.gettingStatus'
    default:
      return ''
  }
}
