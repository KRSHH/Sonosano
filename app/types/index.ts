export interface Song {
  id: string
  name: string
  path: string
  size?: number
  extension?: string
  metadata?: {
    title?: string
    artist?: string
    album?: string
    duration?: number
    coverArt?: string
    year?: string
    bitrate?: number
    sampleRate?: number
    bitsPerSample?: number
    display_quality?: string
    is_fake?: boolean
  }
  dateAdded?: string
  lastPlayed?: string
  playCount?: number
}

export interface Playlist {
  id: string
  name: string
  description: string
  thumbnail: string
  songs: string[]
  createdAt: string
  updatedAt: string
}

export interface AudioMetadata {
  title: string
  artist?: string
  album?: string
  duration?: number
  coverArt?: string
  year?: string
}

export interface DownloadItem {
  id: string
  fileName: string
  path: string
  size: number
  username?: string
  metadata?: AudioMetadata
  status: 'queued' | 'downloading' | 'completed' | 'failed' | 'paused'
  progress: number
  downloadSpeed?: number
  timeRemaining?: number
  queuePosition?: number
  errorMessage?: string
  timestamp: Date
}
export interface SoulseekFile {
  path: string
  size: number
  username: string
  extension?: string
  bitrate?: number
  quality?: string
  length?: string
}

export interface AlbumResult {
  album: string
  files: SoulseekFile[]
}

export interface UserResult {
  username: string
  albums: AlbumResult[]
}

export interface DownloadStatus {
  status: string
  progress: number
  total: number
  percent: number
  speed?: number
  queuePosition?: number
  errorMessage?: string
}
export interface PlaybackState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  currentSong: Song | null
  currentPlaylist: string | null
  currentPlaylistSongs: Song[]
  currentSongIndex: number
  isShuffle: boolean
  isLoop: boolean
}

export interface SystemStatus {
  backend_status: string
  soulseek_status: string
  soulseek_username?: string
  active_uploads: number
  active_downloads: number
}

export interface DownloadsAndStatusResponse {
  downloads: DownloadItem[]
  system_status: SystemStatus
}

export interface MusicBrainzRecording {
  id: string
  title: string
  artist?: string
  album?: string
  coverArt?: string
  length?: number
}
