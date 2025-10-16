import { apiClient } from '../api'

interface CoverCacheResult {
  coverArt: string // Either local path or original URL
  isLocal: boolean
}

// Generate a safe filename from artist and title
function generateCoverFileName(artist: string | undefined, title: string | undefined, url: string): string {
  // Create a base name from artist and title
  const artistClean = (artist || 'unknown').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)
  const titleClean = (title || 'unknown').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)

  // Add a hash of the URL to ensure uniqueness
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }

  return `${artistClean}_${titleClean}_${Math.abs(hash)}.jpg`
}

// Check if a cover already exists locally
async function checkLocalCover(fileName: string): Promise<string | null> {
  try {
    const response = await apiClient.checkLocalCover(fileName)

    if (response.ok) {
      // Return the URL to access the local cover
      const url = response.url.replace('/cover', '/api/cover')
      return url
    }
    return null
  } catch (error) {
    console.error('Error checking local cover:', error)
    return null
  }
}

// Download and save cover to local covers folder
async function downloadCover(url: string, fileName: string): Promise<string | null> {
  try {
    // Send request to backend to download and save the cover
    const response = await apiClient.downloadCover(url, fileName)
    if (response && response.file_path) {
      return `http://localhost:8000/cover/${response.file_path}`
    }
    return null
  } catch (error) {
    console.error('Error downloading cover:', error)
    return null
  }
}

// Main function to get or cache cover
export async function getCachedCoverUrl(
  coverUrl: string | undefined,
  artist?: string,
  title?: string
): Promise<CoverCacheResult> {
  // If no cover URL provided, return as is
  if (!coverUrl) {
    return { coverArt: coverUrl || '', isLocal: false }
  }

  // Skip if already a local URL
  if (coverUrl.includes('localhost:8000/cover/')) {
    return { coverArt: coverUrl, isLocal: true }
  }

  try {
    // Generate a unique filename for this cover
    const fileName = generateCoverFileName(artist, title, coverUrl)

    // Check if we already have this cover locally
    const localUrl = await checkLocalCover(fileName)
    if (localUrl) {
      return { coverArt: localUrl, isLocal: true }
    }

    // Download the cover if not cached
    const downloadedUrl = await downloadCover(coverUrl, fileName)
    if (downloadedUrl) {
      return { coverArt: downloadedUrl, isLocal: true }
    }

    // Fallback to original URL if download failed
    return { coverArt: coverUrl, isLocal: false }
  } catch (error) {
    console.error('Cover cache error:', error)
    // Fallback to original URL on any error
    return { coverArt: coverUrl, isLocal: false }
  }
}

// Update metadata with local cover path
export async function updateMetadataWithLocalCover(metadata: any, artist?: string, title?: string): Promise<any> {
  if (!metadata?.coverArt) {
    return metadata
  }

  const cacheResult = await getCachedCoverUrl(metadata.coverArt, artist || metadata.artist, title || metadata.title)

  return {
    ...metadata,
    coverArt: cacheResult.coverArt,
    coverArtCached: cacheResult.isLocal,
  }
}
