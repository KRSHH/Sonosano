import Fuse from 'fuse.js'
import { SoulseekFile } from '../types'

// Calculate quality score for each file (0-100)
const getQualityScore = (file: SoulseekFile): number => {
  let score = 0

  // Bitrate contribution (up to 50 points)
  if (file.bitrate) {
    // FLAC/lossless typically shows as very high bitrate or specific quality string
    if (file.quality?.toLowerCase().includes('lossless')) {
      score += 50
    } else if (file.bitrate >= 320) {
      score += 45
    } else if (file.bitrate >= 256) {
      score += 35
    } else if (file.bitrate >= 192) {
      score += 25
    } else if (file.bitrate >= 128) {
      score += 15
    } else {
      score += 5
    }
  }

  // File extension contribution (up to 30 points)
  const ext = file.extension?.toLowerCase() || file.path.split('.').pop()?.toLowerCase()
  if (ext === 'flac' || ext === 'wav') {
    score += 30
  } else if (ext === 'mp3' && file.bitrate && file.bitrate >= 320) {
    score += 25
  } else if (ext === 'mp3' && file.bitrate && file.bitrate >= 256) {
    score += 20
  } else if (ext === 'mp3') {
    score += 15
  } else if (ext === 'm4a' || ext === 'aac') {
    score += 20
  } else if (ext === 'ogg' || ext === 'opus') {
    score += 18
  }

  // File size contribution (up to 20 points) - larger usually means better quality
  if (file.size > 50000000) {
    // > 50MB
    score += 20
  } else if (file.size > 20000000) {
    // > 20MB
    score += 15
  } else if (file.size > 10000000) {
    // > 10MB
    score += 10
  } else if (file.size > 5000000) {
    // > 5MB
    score += 5
  }

  return score
}

export const sortSoulseekFiles = (soulseekFiles: SoulseekFile[], searchQuery: string): SoulseekFile[] => {
  if (!soulseekFiles || soulseekFiles.length === 0 || !searchQuery) {
    return soulseekFiles
  }

  // Prepare files with quality scores
  const filesWithScores = soulseekFiles.map((file) => ({
    ...file,
    qualityScore: getQualityScore(file),
  }))

  // Configure Fuse.js for searching file paths
  const fuseOptions = {
    keys: ['path'],
    threshold: 0.4, // Adjust for more/less strict matching
    location: 0,
    distance: 100,
    includeScore: true,
    shouldSort: true,
    minMatchCharLength: 2,
    ignoreLocation: false,
    useExtendedSearch: false,
  }

  // Create Fuse instance
  const fuse = new Fuse(filesWithScores, fuseOptions)

  // Search for files matching the query
  const searchResults = fuse.search(searchQuery)

  // Files that matched the search
  const matchedFiles = searchResults.map((result) => ({
    ...result.item,
    relevanceScore: 1 - (result.score || 0), // Convert Fuse score (0=perfect) to relevance (1=perfect)
  }))

  // Files that didn't match the search
  const unmatchedFiles = filesWithScores
    .filter((file) => !matchedFiles.find((matched) => matched.id === file.id))
    .map((file) => ({
      ...file,
      relevanceScore: 0,
    }))

  // Combine all files
  const allFiles = [...matchedFiles, ...unmatchedFiles]

  // Sort by combined score (relevance + quality)
  // Give 60% weight to relevance and 40% to quality
  const sorted = allFiles.sort((a, b) => {
    const scoreA = a.relevanceScore * 60 + a.qualityScore * 0.4
    const scoreB = b.relevanceScore * 60 + b.qualityScore * 0.4
    return scoreB - scoreA // Higher scores first
  })

  // Remove the temporary scoring properties and limit to top 100
  return sorted
    .slice(0, 100) // Take only the top 100 files
    .map(({ ...file }) => file as SoulseekFile)
}
