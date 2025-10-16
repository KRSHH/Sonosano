import { usePlaybackManager } from './usePlaybackManager'
import { useLibrarySongs } from './useLibrarySongs'
import { Playlist } from '../types'

export const usePlaylistPlayback = (playlist: Playlist | null) => {
  const { playbackState } = usePlaybackManager()
  const { data: libraryFiles = [] } = useLibrarySongs()
  const { isPlaying, currentSong, currentPlaylist } = playbackState

  if (!playlist) {
    return {
      isCurrentPlaylist: false,
      isPlaying: false,
      currentlyPlayingFile: null,
      playlistSongs: [],
    }
  }

  const playlistSongs = libraryFiles.filter((file) => playlist.songs.includes(file.path))

  const isCurrentPlaylist = currentPlaylist === 'current' && playlistSongs.some((song) => song.id === currentSong?.id)

  const currentlyPlayingFile = isCurrentPlaylist ? currentSong : null

  return {
    isCurrentPlaylist,
    isPlaying: isCurrentPlaylist && isPlaying,
    currentlyPlayingFile,
    playlistSongs,
  }
}
