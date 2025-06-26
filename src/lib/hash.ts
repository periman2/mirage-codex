import { sha256 } from '@noble/hashes/sha2'
import stringify from 'fast-json-stable-stringify'

export interface SearchParams {
  freeText: string | null
  languageCode: string
  genreSlug: string
  tagSlugs: string[]
  modelName: string
  extraJson?: any
}

/**
 * Creates a deterministic hash from search parameters
 * Same parameters always produce the same hash
 */
export function createSearchHash(params: SearchParams): string {
  // Normalize parameters for consistent hashing
  const normalized = {
    freeText: params.freeText?.trim() || null,
    languageCode: params.languageCode,
    genreSlug: params.genreSlug,
    tagSlugs: params.tagSlugs.sort(), // Sort tags for consistency
    modelName: params.modelName,
    extraJson: params.extraJson || null
  }

  // Create canonical JSON string
  const canonical = stringify(normalized)
  
  // Hash with SHA-256
  const hashBytes = sha256(canonical)
  
  // Convert to hex string
  return Array.from(hashBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Validates search parameters
 */
export function validateSearchParams(params: Partial<SearchParams>): SearchParams | null {
  if (!params.languageCode || !params.genreSlug || !params.modelName) {
    return null
  }

  return {
    freeText: params.freeText || null,
    languageCode: params.languageCode,
    genreSlug: params.genreSlug,
    tagSlugs: params.tagSlugs || [],
    modelName: params.modelName,
    extraJson: params.extraJson || null
  }
} 