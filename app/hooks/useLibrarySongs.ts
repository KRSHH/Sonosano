import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api'
import { Song } from '../types'

const fetchLibrarySongs = (): Promise<Song[]> => {
  return apiClient.getLibrarySongs().then((data) =>
    data.map((song: any) => {
      const metadata = song.metadata || {}
      if (metadata.coverArt && !metadata.coverArt.startsWith('data:') && !metadata.coverArt.startsWith('http')) {
        metadata.coverArt = apiClient.getCoverUrl(metadata.coverArt)
      }
      return {
        id: song.path,
        name: metadata.title || song.path.split(/[\\/]/).pop() || 'Unknown',
        path: song.path,
        size: metadata.size,
        extension: metadata.extension,
        metadata: metadata,
        dateAdded: song.date_added ? new Date(song.date_added * 1000).toISOString() : new Date().toISOString(),
        playCount: 0,
      }
    })
  )
}

export const useLibrarySongs = () => {
  return useQuery<Song[], Error>({
    queryKey: ['librarySongs'],
    queryFn: fetchLibrarySongs,
    staleTime: 5 * 60 * 1000,
  })
}
