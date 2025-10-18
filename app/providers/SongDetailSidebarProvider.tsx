import React, { createContext, useState, useContext, ReactNode } from 'react'
import { MusicBrainzRecording } from '../types'

interface SidebarContextType {
  selectedSong: MusicBrainzRecording | null
  setSelectedSong: (song: MusicBrainzRecording | null) => void
}

const SongDetailSidebarContext = createContext<SidebarContextType | undefined>(undefined)

export const SongDetailSidebarProvider = ({ children }: { children: ReactNode }) => {
  const [selectedSong, setSelectedSong] = useState<MusicBrainzRecording | null>(null)

  const value = {
    selectedSong,
    setSelectedSong,
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
