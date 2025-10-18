import { useState, useEffect, useRef, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { UserResult } from '../types' // Assuming types will be updated in index.ts

interface SoulseekSearchStream {
  [searchId: string]: UserResult[]
}

interface UseSoulseekSearchStreamReturn {
  results: SoulseekSearchStream
  startSearch: (query: string, searchId: string) => void
  stopSearch: (searchId: string) => void
  subscribe: (searchId: string, callback: (data: any) => void) => () => void
  getConnectionState: () => 'Connecting' | 'Open' | 'Closed'
}

const WEBSOCKET_URL = `ws://localhost:8000/ws/search/${uuidv4()}`

// This hook will be a singleton to manage one WebSocket connection.
let socket: WebSocket | null = null
let connectionState: 'Connecting' | 'Open' | 'Closed' = 'Closed'
const subscribers: Map<string, Set<(data: any) => void>> = new Map()
let searchResults: SoulseekSearchStream = {}

const connectSocket = () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return
  }

  if (connectionState === 'Connecting') {
    return
  }

  connectionState = 'Connecting'
  socket = new WebSocket(WEBSOCKET_URL)

  socket.onopen = () => {
    connectionState = 'Open'
    console.log('Soulseek WebSocket Connected')
  }

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data)
    const { searchId, results: newResults } = message

    if (searchId && newResults) {
      // This logic assumes the backend sends updates per user.
      // We need to merge this with existing results for the same searchId.
      const existingUsers = searchResults[searchId] || []
      const updatedUsers = [...existingUsers]

      newResults.forEach((newUserResult: UserResult) => {
        const existingUserIndex = updatedUsers.findIndex((u) => u.username === newUserResult.username)
        if (existingUserIndex > -1) {
          // If user exists, merge their albums
          updatedUsers[existingUserIndex] = newUserResult // Replace with the latest data for simplicity
        } else {
          updatedUsers.push(newUserResult)
        }
      })

      searchResults[searchId] = updatedUsers

      if (subscribers.has(searchId)) {
        subscribers.get(searchId)?.forEach((callback) => callback(searchResults[searchId]))
      }
    }
  }

  socket.onclose = () => {
    connectionState = 'Closed'
    console.log('Soulseek WebSocket Disconnected')
    socket = null
    // Optional: Implement reconnection logic here
  }

  socket.onerror = (error) => {
    console.error('WebSocket Error:', error)
    connectionState = 'Closed'
    socket?.close()
  }
}

const sendMessage = (message: object) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message))
  } else {
    console.error('WebSocket is not connected.')
  }
}

export const useSoulseekSearchStream = (): UseSoulseekSearchStreamReturn => {
  useEffect(() => {
    connectSocket() // Ensure connection is established when the hook is first used.
  }, [])

  const startSearch = useCallback((query: string, searchId: string) => {
    searchResults[searchId] = [] // Clear previous results for this searchId
    sendMessage({ action: 'start_search', searchId, query })
  }, [])

  const stopSearch = useCallback((searchId: string) => {
    sendMessage({ action: 'stop_search', searchId })
    delete searchResults[searchId]
  }, [])

  const subscribe = useCallback((searchId: string, callback: (data: any) => void) => {
    if (!subscribers.has(searchId)) {
      subscribers.set(searchId, new Set())
    }
    subscribers.get(searchId)?.add(callback)

    // Immediately provide current results if any
    if (searchResults[searchId]) {
      callback(searchResults[searchId])
    }

    return () => {
      subscribers.get(searchId)?.delete(callback)
    }
  }, [])

  const getConnectionState = () => connectionState

  return { results: searchResults, startSearch, stopSearch, subscribe, getConnectionState }
}