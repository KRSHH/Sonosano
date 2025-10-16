import { useContext } from 'react'
import { PlaybackContext } from '../providers/PlaybackProvider'

/**
 * Custom hook to access the PlaybackManager instance from the PlaybackContext.
 * This is the sole method components should use to interact with the playback system.
 * @returns The PlaybackManager instance.
 */
export const usePlaybackManager = () => {
  const context = useContext(PlaybackContext)

  if (context === undefined) {
    throw new Error('usePlaybackManager must be used within a PlaybackProvider')
  }

  return context
}
