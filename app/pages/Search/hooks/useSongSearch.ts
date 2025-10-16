import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../api'
import useLocalStorage from '../../../hooks/useLocalStorage'

export const useSongSearch = () => {
  useQueryClient()
  const [searchEnabled, setSearchEnabled] = useState(false)
  const [query, setQuery] = useState('')
  const [searchMode] = useLocalStorage<string>('searchMode', 'apple_music')

  const searchResults = useQuery({
    queryKey: ['search', searchMode, query],
    queryFn: () => {
      if (!query) return Promise.resolve([])
      return apiClient.search(searchMode, query)
    },
    enabled: searchEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const performSearch = useCallback((newQuery: string) => {
    if (!newQuery.trim()) {
      setSearchEnabled(false)
      setQuery('')
      return
    }

    setQuery(newQuery)
    setSearchEnabled(true)
  }, [])

  return {
    searchResults: searchResults.data || [],
    isSearching: searchResults.isLoading,
    searchError: searchResults.error?.message || null,
    performSearch,
  }
}
