import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from './supabase'
import type { Tables } from './database.types'

// Query keys factory
export const queryKeys = {
  books: {
    all: ['books'] as const,
    lists: () => [...queryKeys.books.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.books.lists(), filters] as const,
    details: () => [...queryKeys.books.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.books.details(), id] as const,
  },
  languages: {
    all: ['languages'] as const,
    list: () => [...queryKeys.languages.all, 'list'] as const,
  },
  genres: {
    all: ['genres'] as const,
    list: () => [...queryKeys.genres.all, 'list'] as const,
  },
  tags: {
    all: ['tags'] as const,
    list: () => [...queryKeys.tags.all, 'list'] as const,
    byCategory: (categoryId: number) => [...queryKeys.tags.all, 'category', categoryId] as const,
  },
  searches: {
    all: ['searches'] as const,
    lists: () => [...queryKeys.searches.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.searches.lists(), filters] as const,
  },
}

// Languages
export function useLanguages() {
  const supabase = createSupabaseBrowserClient()
  
  return useQuery({
    queryKey: queryKeys.languages.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('languages')
        .select('*')
        .order('label')
      
      if (error) throw error
      return data
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - languages don't change often
  })
}

// Genres
export function useGenres() {
  const supabase = createSupabaseBrowserClient()
  
  return useQuery({
    queryKey: queryKeys.genres.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('genres')
        .select('*')
        .eq('is_active', true)
        .order('order_index')
      
      if (error) throw error
      return data
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}

// Tags
export function useTags() {
  const supabase = createSupabaseBrowserClient()
  
  return useQuery({
    queryKey: queryKeys.tags.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select(`
          *,
          tag_categories (
            id,
            label,
            slug,
            order_index
          )
        `)
        .eq('is_active', true)
        .order('label')
      
      if (error) throw error
      return data
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}

// Books with infinite scrolling
export function useBooks(filters: {
  language_id?: number
  genre_id?: string
  tag_ids?: string[]
  search?: string
} = {}) {
  const supabase = createSupabaseBrowserClient()
  
  return useInfiniteQuery({
    queryKey: queryKeys.books.list(filters),
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * 20
      const to = from + 19
      
      let query = supabase
        .from('books')
        .select(`
          *,
          authors (
            id,
            pen_name,
            bio
          ),
          languages (
            id,
            code,
            label
          )
        `)
        .range(from, to)
        .order('created_at', { ascending: false })
      
      // Apply filters
      if (filters.language_id) {
        query = query.eq('primary_language_id', filters.language_id)
      }
      
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,summary.ilike.%${filters.search}%`)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data || []
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length : undefined
    },
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Single book details
export function useBook(bookId: string) {
  const supabase = createSupabaseBrowserClient()
  
  return useQuery({
    queryKey: queryKeys.books.detail(bookId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          authors (
            id,
            pen_name,
            bio,
            style_prompt
          ),
          languages (
            id,
            code,
            label
          ),
          editions (
            id,
            language_id,
            model_id,
            created_at,
            languages (
              id,
              code,
              label
            ),
            models (
              id,
              name,
              domain_code
            )
          )
        `)
        .eq('id', bookId)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!bookId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// User's searches
export function useUserSearches(userId?: string) {
  const supabase = createSupabaseBrowserClient()
  
  return useQuery({
    queryKey: queryKeys.searches.list({ userId }),
    queryFn: async () => {
      if (!userId) return []
      
      const { data, error } = await supabase
        .from('searches')
        .select(`
          *,
          genres (
            id,
            label,
            slug
          ),
          languages (
            id,
            code,
            label
          ),
          models (
            id,
            name,
            domain_code
          ),
          search_params (
            free_text,
            tag_ids,
            extra_json
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
} 