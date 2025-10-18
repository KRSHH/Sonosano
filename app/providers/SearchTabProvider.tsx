import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { MusicBrainzRecording } from '../types'

export type TabType = 'RICH_RESULTS' | 'SOULSEEK_RESULTS'

export interface SearchTab {
  id: string
  type: TabType
  title: string
  query?: string
  metadata?: MusicBrainzRecording // For Soulseek tabs, to show cover art etc.
}

interface SearchTabContextType {
  tabs: SearchTab[]
  activeTabId: string | null
  addTab: (tabData: Omit<SearchTab, 'id'>) => string
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
}

const SearchTabContext = createContext<SearchTabContextType | undefined>(undefined)

export const SearchTabProvider = ({ children }: { children: ReactNode }) => {
  const [tabs, setTabs] = useState<SearchTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)

  const addTab = useCallback((tabData: Omit<SearchTab, 'id'>): string => {
    const newTabId = uuidv4()
    const newTab: SearchTab = { id: newTabId, ...tabData }

    // If it's a RICH_RESULTS tab, it replaces any existing one.
    if (newTab.type === 'RICH_RESULTS') {
      const existingRichTab = tabs.find((t) => t.type === 'RICH_RESULTS')
      if (existingRichTab) {
        // Replace the existing rich results tab
        setTabs((prevTabs) => prevTabs.map((t) => (t.id === existingRichTab.id ? newTab : t)))
      } else {
        setTabs((prevTabs) => [newTab, ...prevTabs])
      }
    } else {
      setTabs((prevTabs) => [...prevTabs, newTab])
    }

    setActiveTabId(newTabId)
    return newTabId
  }, [tabs])

  const removeTab = useCallback((tabId: string) => {
    setTabs((prevTabs) => {
      const newTabs = prevTabs.filter((tab) => tab.id !== tabId)
      if (activeTabId === tabId) {
        // If the active tab is closed, switch to the first available tab or none
        setActiveTabId(newTabs.length > 0 ? newTabs[0].id : null)
      }
      return newTabs
    })
  }, [activeTabId])

  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabId(tabId)
  }, [])

  const value = {
    tabs,
    activeTabId,
    addTab,
    removeTab,
    setActiveTab,
  }

  return <SearchTabContext.Provider value={value}>{children}</SearchTabContext.Provider>
}

export const useSearchTabs = () => {
  const context = useContext(SearchTabContext)
  if (!context) {
    throw new Error('useSearchTabs must be used within a SearchTabProvider')
  }
  return context
}