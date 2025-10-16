import React, { createContext, useState, useContext, ReactNode } from 'react'
import { MusicBrainzRecording, SoulseekFile, DownloadStatus } from '../types'
import { apiClient } from '../api'
import { downloadEvents } from '../utils/downloadEvents'

interface SidebarContextType {
  selectedSong: MusicBrainzRecording | null
  setSelectedSong: (song: MusicBrainzRecording | null) => void
  soulseekFiles: SoulseekFile[]
  setSoulseekFiles: (files: SoulseekFile[]) => void
  downloadStatus: Record<string, DownloadStatus>
  setDownloadStatus: (status: Record<string, DownloadStatus>) => void
  sidebarLoading: boolean
  setSidebarLoading: (loading: boolean) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchAbortController: AbortController | null
  setSearchAbortController: (controller: AbortController | null) => void
  error: string | null
  setError: (error: string | null) => void
  handleDownloadFile: (file: SoulseekFile) => Promise<void>
}

const SongDetailSidebarContext = createContext<SidebarContextType | undefined>(undefined)

export const SongDetailSidebarProvider = ({ children }: { children: ReactNode }) => {
  const [selectedSong, setSelectedSong] = useState<MusicBrainzRecording | null>(null)
  const [soulseekFiles, setSoulseekFiles] = useState<SoulseekFile[]>([])
  const [downloadStatus, setDownloadStatus] = useState<Record<string, DownloadStatus>>({})
  const [sidebarLoading, setSidebarLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchAbortController, setSearchAbortController] = useState<AbortController | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDownloadFile = async (file: SoulseekFile) => {
    try {
      // Prepare metadata from the file
      const metadata: any = {}

      // Add quality/bitrate info from Soulseek file
      metadata.quality = file.quality
      metadata.bitrate = file.bitrate
      metadata.length = file.length

      // Add song metadata if available from selected song
      if (selectedSong) {
        metadata.title = selectedSong.title
        metadata.artist = selectedSong.artist
        metadata.album = selectedSong.album
        metadata.coverArt = selectedSong.coverArt
      }

      // Create a unique ID for this download
      const downloadId = `${file.username}_${file.path}_${Date.now()}`

      // Emit download started event immediately (optimistic update)
      downloadEvents.emitDownloadStarted({
        id: downloadId,
        fileName: file.path.split('\\').pop() || file.path.split('/').pop() || 'Unknown',
        path: file.path,
        size: file.size || 0,
        metadata: metadata,
      })

      // Update download status to show it's queued
      setDownloadStatus((prev) => ({
        ...prev,
        [file.id]: {
          status: 'Queued',
          progress: 0,
          total: file.size || 0,
          percent: 0,
        },
      }))

      // Send request to backend
      await apiClient.startDownload(file.username, file.path, file.size || 0, metadata, downloadId)
    } catch (err) {
      console.error('Download failed:', err)

      // Emit download failed event
      downloadEvents.emitDownloadFailed(file.id, 'Failed to start download')

      // Update status to show error
      setDownloadStatus((prev) => ({
        ...prev,
        [file.id]: {
          status: 'Error',
          progress: 0,
          total: file.size || 0,
          percent: 0,
          errorMessage: 'Failed to start download',
        },
      }))
    }
  }

  const value = {
    selectedSong,
    setSelectedSong,
    soulseekFiles,
    setSoulseekFiles,
    downloadStatus,
    setDownloadStatus,
    sidebarLoading,
    setSidebarLoading,
    searchQuery,
    setSearchQuery,
    searchAbortController,
    setSearchAbortController,
    error,
    setError,
    handleDownloadFile,
  }

  return <SongDetailSidebarContext.Provider value={value}>{children}</SongDetailSidebarContext.Provider>
}

export const useSongDetailSidebar = () => {
  const context = useContext(SongDetailSidebarContext)
  if (!context) {
    throw new Error('useSongDetailSidebar must be used within a SongDetailSidebarProvider')
  }
  return context
}
