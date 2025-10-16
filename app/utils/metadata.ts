import { AudioMetadata } from '../types'

// Extract basic metadata from filename if not provided
export const extractMetadataFromFilename = (filename: string): AudioMetadata => {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')

  // Remove track number if present (e.g., "03 - " or "03. ")
  const cleanedName = nameWithoutExt.replace(/^\d+\s*[-.]\s*/, '')

  // Try to parse Artist - Title format
  const parts = cleanedName.split(' - ')
  if (parts.length >= 2) {
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(' - ').trim(),
    }
  }

  // Default to cleaned filename as title
  return {
    title: cleanedName,
  }
}
