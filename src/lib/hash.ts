import { sha256 } from '@noble/hashes/sha2'
import stringify from 'fast-json-stable-stringify'

export interface SearchParams {
  freeText: string | null
  languageCode: string | null
  genreSlug: string | null
  tagSlugs: string[]
  modelId: number
  pageNumber: number
  pageSize: number
  extraJson?: any
}

/**
 * Creates a deterministic hash from search parameters
 * Same parameters always produce the same hash
 * Note: modelName and languageCode are excluded from hash as they represent
 * different editions/translations of the same conceptual books
 * pageNumber and pageSize are included for pagination caching
 * genreSlug can be null for AI-determined genre searches
 * languageCode can be null for AI-determined language searches
 */
export function createSearchHash(params: SearchParams): string {
  // Normalize parameters for consistent hashing
  // Include pagination parameters for per-page caching
  const normalized = {
    freeText: params.freeText?.trim() || null,
    languageCode: params.languageCode || null,
    genreSlug: params.genreSlug || null,
    tagSlugs: params.tagSlugs.sort(),
    pageNumber: params.pageNumber,
    pageSize: params.pageSize,
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
  if (!params.modelId) {
    return null
  }

  // For AI-determined searches, we require either:
  // 1. At least freeText if both language and genre are empty
  // 2. Or at least one of language/genre is provided
  if (!params.languageCode && !params.genreSlug && (!params.freeText || !params.freeText.trim())) {
    return null
  }

  return {
    freeText: params.freeText || null,
    languageCode: params.languageCode || null, // Allow null for AI determination
    genreSlug: params.genreSlug || null, // Allow null for AI determination
    tagSlugs: params.tagSlugs || [],
    modelId: params.modelId,
    pageNumber: params.pageNumber || 1,
    pageSize: params.pageSize || 3, // Default to PAGE_SIZE
    extraJson: params.extraJson || null
  }
} 