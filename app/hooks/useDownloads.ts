import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api'
import { DownloadItem, SystemStatus } from '../types'

const fetchDownloadsAndStatus = async (queryClient: any): Promise<DownloadItem[]> => {
  try {
    const data = await apiClient.getDownloadsStatus()

    // Update system status in cache
    queryClient.setQueryData(['systemStatus'], data.system_status)

    const downloads: DownloadItem[] = data.downloads.map((item: any) => {
      const progress = parseFloat(item.percent) || 0

      return {
        id: item.id || item.file_path,
        fileName: item.file_name || item.path?.split('\\').pop() || 'Unknown',
        path: item.file_path || item.path,
        size: item.size || 0,
        metadata: item.metadata,
        status: mapStatus(item.status),
        progress: progress,
        downloadSpeed: item.speed,
        timeRemaining: item.time_remaining,
        queuePosition: item.queue_position,
        errorMessage: item.error_message,
        timestamp: new Date(item.timestamp * 1000 || Date.now()),
      }
    })

    downloads.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return downloads
  } catch (error) {
    console.error('Failed to fetch downloads and status:', error)
    // If the fetch fails, update the system status to reflect that the backend is offline
    queryClient.setQueryData(['systemStatus'], {
      backend_status: 'Offline',
      soulseek_status: 'Disconnected',
      soulseek_username: null,
      active_uploads: 0,
      active_downloads: 0,
    })
    return [] // Return empty array for downloads
  }
}

const mapStatus = (status: string): DownloadItem['status'] => {
  const statusMap: { [key: string]: DownloadItem['status'] } = {
    Queued: 'queued',
    Transferring: 'downloading',
    Finished: 'completed',
    Error: 'failed',
    Paused: 'paused',
    'Connection timeout': 'failed',
    'User logged off': 'failed',
  }
  return statusMap[status] || 'queued'
}

export const useDownloads = () => {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['downloadStatus'],
    queryFn: () => fetchDownloadsAndStatus(queryClient),
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  })
}

export const useSystemStatus = () => {
  return useQuery<SystemStatus>({
    queryKey: ['systemStatus'],
    // The data is set by fetchDownloadsAndStatus, so we don't need a queryFn here.
    // It will be populated by the downloads query.
    staleTime: Infinity, // Data is always fresh from the other query
  })
}
