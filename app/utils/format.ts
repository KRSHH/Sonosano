export const formatBytes = (bytes: number, decimals = 2): string => {
  if (!bytes || bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export const formatDuration = (duration: number | undefined): string => {
  if (!duration || isNaN(duration) || duration < 0) return '0:00'
  // Assume duration can be in seconds or milliseconds
  const totalSeconds = duration > 10000 ? Math.floor(duration / 1000) : Math.floor(duration)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
