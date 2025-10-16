import React, { createContext, ReactNode, useEffect, useState } from 'react'
import { PlaybackManager, PlaybackState } from '../lib/managers/PlaybackManager'

export const PlaybackContext = createContext<
  | {
      playbackManager: PlaybackManager
      playbackState: PlaybackState
    }
  | undefined
>(undefined)

interface PlaybackProviderProps {
  children: ReactNode
}

/**
 * Provides the PlaybackManager instance to the entire application.
 * It also listens for playback events and triggers re-renders when the state changes.
 */
export const PlaybackProvider: React.FC<PlaybackProviderProps> = ({ children }) => {
  const [playbackManager] = useState(() => PlaybackManager.getInstance())
  const [playbackState, setPlaybackState] = useState<PlaybackState>(playbackManager.getState())

  useEffect(() => {
    const unsubscribe = playbackManager.subscribe(setPlaybackState)
    return unsubscribe
  }, [playbackManager])

  return <PlaybackContext.Provider value={{ playbackManager, playbackState }}>{children}</PlaybackContext.Provider>
}
