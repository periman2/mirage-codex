import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from './supabase'
import type { Tables } from './database.types'
import { transformBookWithStats } from './book-transform'

// Query keys factory
export const queryKeys = {
  books: {
    all: ['books'] as const,
    lists: () => [...queryKeys.books.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.books.lists(), filters] as const,
    details: () => [...queryKeys.books.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.books.details(), id] as const,
    userSearched: (userId: string, limit: number) => [...queryKeys.books.all, 'userSearched', userId, limit] as const,
    userLiked: (userId: string, limit: number) => [...queryKeys.books.all, 'userLiked', userId, limit] as const,
    latest: (limit: number) => [...queryKeys.books.all, 'latest', limit] as const,
    byGenre: (genreSlug: string, limit: number) => [...queryKeys.books.all, 'byGenre', genreSlug, limit] as const,
    random: () => [...queryKeys.books.all, 'random'] as const,
  },
  languages: {
    all: ['languages'] as const,
    list: () => [...queryKeys.languages.all, 'list'] as const,
  },
  genres: {
    all: ['genres'] as const,
    list: () => [...queryKeys.genres.all, 'list'] as const,
  },
  models: {
    all: ['models'] as const,
    list: () => [...queryKeys.models.all, 'list'] as const,
  },
  tags: {
    all: ['tags'] as const,
    list: () => [...queryKeys.tags.all, 'list'] as const,
    byCategory: (categoryId: number) => [...queryKeys.tags.all, 'category', categoryId] as const,
    byGenre: (genreId?: string) => [...queryKeys.tags.all, 'genre', genreId] as const,
  },
  searches: {
    all: ['searches'] as const,
    lists: () => [...queryKeys.searches.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.searches.lists(), filters] as const,
  },
  pages: {
    all: ['pages'] as const,
    adjacent: (editionId: string, currentPage: number) => [...queryKeys.pages.all, 'adjacent', editionId, currentPage] as const,
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

// Models
export function useModels() {
  const supabase = createSupabaseBrowserClient()
  
  return useQuery({
    queryKey: queryKeys.models.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('models')
        .select(`
          id,
          name,
          domain_code,
          context_len,
          prompt_cost,
          completion_cost,
          search_credits,
          page_generation_credits,
          is_active,
          model_domains (
            label
          )
        `)
        .eq('is_active', true)
        .order('domain_code')
        .order('name')
      
      if (error) throw error
      return data
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - models don't change often
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

// Tags filtered by genre
export function useTagsByGenre(genreId?: string) {
  const supabase = createSupabaseBrowserClient()
  
  return useQuery({
    queryKey: queryKeys.tags.byGenre(genreId),
    queryFn: async () => {
      if (!genreId) return []
      
      const { data, error } = await supabase
        .from('genre_tags')
        .select(`
          tags (
            id,
            slug,
            label,
            prompt_boost,
            tag_categories (
              id,
              label,
              slug,
              order_index
            )
          )
        `)
        .eq('genre_id', genreId)
        .order('tags(label)')
      
      if (error) throw error
      return data?.map(gt => gt.tags).filter(Boolean) || []
    },
    enabled: !!genreId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}

// Books with infinite scrolling - Updated to include genre_id
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
          ),
          genres (
            id,
            slug,
            label
          ),
          book_stats (
            likes_cnt,
            views_cnt
          )
        `)
        .range(from, to)
        .order('created_at', { ascending: false })
      
      // Apply filters
      if (filters.language_id) {
        query = query.eq('primary_language_id', filters.language_id)
      }
      
      if (filters.genre_id) {
        query = query.eq('genre_id', filters.genre_id)
      }
      
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,summary.ilike.%${filters.search}%`)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return (data || []).map(transformBookWithStats).filter(Boolean)
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length : undefined
    },
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// User's searched books (books from their search results) - Fixed query structure
export function useUserSearchedBooks(userId: string, limit: number = 10) {
  const supabase = createSupabaseBrowserClient()
  
  return useInfiniteQuery({
    queryKey: queryKeys.books.userSearched(userId, limit),
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * limit
      const to = from + limit - 1
      
      // First get the search IDs for this user, ordered by creation date
      const { data: searchIds, error: searchError } = await supabase
        .from('searches')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to)
      
      if (searchError) throw searchError
      if (!searchIds?.length) return []
      
      // Then get books from those searches
      const { data: searchBooks, error: booksError } = await supabase
        .from('search_books')
        .select(`
          books (
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
            ),
            genres (
              id,
              slug,
              label
            ),
            editions (
              id,
              model_id,
              language_id,
              models (
                id,
                name
              )
            ),
            book_stats (
              likes_cnt,
              views_cnt
            )
          )
        `)
        .in('search_id', searchIds.map(s => s.id))
        .order('rank', { ascending: true })
      
      if (booksError) throw booksError
      
      // Flatten and deduplicate books
      const books = searchBooks?.map(item => item.books).filter(Boolean) || []
      const uniqueBooks = books.filter((book, index, self) => 
        index === self.findIndex(b => b?.id === book?.id)
      )
      
      return uniqueBooks.map(transformBookWithStats).filter(Boolean)
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === limit ? allPages.length : undefined
    },
    initialPageParam: 0,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// User's liked books (most recently liked first)
export function useUserLikedBooks(userId: string, limit: number = 10) {
  const supabase = createSupabaseBrowserClient()
  
  return useInfiniteQuery({
    queryKey: queryKeys.books.userLiked(userId, limit),
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * limit
      const to = from + limit - 1
      
      const { data, error } = await supabase
        .from('book_reactions')
        .select(`
          books (
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
            ),
            genres (
              id,
              slug,
              label
            ),
            editions (
              id,
              model_id,
              language_id,
              models (
                id,
                name
              )
            ),
            book_stats (
              likes_cnt,
              views_cnt
            )
          )
        `)
        .eq('user_id', userId)
        .eq('reaction_type', 'like')
        .order('created_at', { ascending: false })
        .range(from, to)
      
      if (error) throw error
      
      // Extract books and transform them
      const books = data?.map(reaction => reaction.books).filter(Boolean) || []
      return books.map(transformBookWithStats).filter(Boolean)
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === limit ? allPages.length : undefined
    },
    initialPageParam: 0,
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes - likes can change frequently
  })
}

// Latest releases (most recently created books) - Converted to infinite query
export function useLatestBooks(limit: number = 10) {
  const supabase = createSupabaseBrowserClient()
  
  return useInfiniteQuery({
    queryKey: queryKeys.books.latest(limit),
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * limit
      const to = from + limit - 1
      
      const { data, error } = await supabase
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
          ),
          genres (
            id,
            slug,
            label
          ),
          editions (
            id,
            model_id,
            language_id,
            models (
              id,
              name
            )
          ),
          book_stats (
            likes_cnt,
            views_cnt
          )
        `)
        .order('created_at', { ascending: false })
        .range(from, to)
      
      if (error) throw error
      return (data || []).map(transformBookWithStats).filter(Boolean)
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === limit ? allPages.length : undefined
    },
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Books by specific genre - Converted to infinite query
export function useBooksByGenre(genreSlug: string, limit: number = 10) {
  const supabase = createSupabaseBrowserClient()
  
  return useInfiniteQuery({
    queryKey: queryKeys.books.byGenre(genreSlug, limit),
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * limit
      const to = from + limit - 1
      
      const { data, error } = await supabase
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
          ),
          genres!inner (
            id,
            slug,
            label
          ),
          editions (
            id,
            model_id,
            language_id,
            models (
              id,
              name
            )
          ),
          book_stats (
            likes_cnt,
            views_cnt
          )
        `)
        .eq('genres.slug', genreSlug)
        .order('created_at', { ascending: false })
        .range(from, to)
      
      if (error) throw error
      return (data || []).map(transformBookWithStats).filter(Boolean)
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === limit ? allPages.length : undefined
    },
    initialPageParam: 0,
    enabled: !!genreSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Single book details - Updated to include genre
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
          genres (
            id,
            slug,
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
        .limit(1)
        .maybeSingle()
      
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

// Random book
export function useRandomBook() {
  const supabase = createSupabaseBrowserClient()
  
  return useQuery({
    queryKey: queryKeys.books.random(),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_random_book')
      
      if (error) throw error
      
      if (!data || data.length === 0) {
        return null
      }
      
      const book = data[0]
      
      // Transform the RPC result to match our SearchResultBook type
      return {
        id: book.book_id,
        title: book.book_title,
        summary: book.book_summary,
        pageCount: book.book_page_count,
        coverUrl: book.book_cover_url,
        bookCoverPrompt: book.book_cover_prompt,
        author: {
          id: book.author_id,
          penName: book.author_pen_name,
          bio: book.author_bio
        },
        language: book.language_code,
        genre: {
          slug: book.genre_slug,
          label: book.genre_label
        },
        sections: [], // Random book doesn't need sections
        edition: {
          id: book.edition_id,
          modelId: book.model_id,
          modelName: book.model_name
        }
      }
    },
    enabled: false, // Only fetch when explicitly triggered
    staleTime: 0, // Always fresh random results
    gcTime: 0, // Don't cache random results
  })
}

// Adjacent pages (previous and next) to check if they're already generated
export function useAdjacentPages(editionId: string | null, currentPage: number, totalPages: number) {
  const supabase = createSupabaseBrowserClient()
  
  return useQuery({
    queryKey: queryKeys.pages.adjacent(editionId || '', currentPage),
    queryFn: async () => {
      if (!editionId) return { prevPage: null, nextPage: null }
      
      const pagesToCheck = []
      
      // Check previous page if not on first page
      if (currentPage > 1) {
        pagesToCheck.push(currentPage - 1)
      }
      
      // Check next page if not on last page
      if (currentPage < totalPages) {
        pagesToCheck.push(currentPage + 1)
      }
      
      if (pagesToCheck.length === 0) {
        return { prevPage: null, nextPage: null }
      }
      console.log('pagesToCheck: ', pagesToCheck)
      const { data, error } = await supabase
        .from('book_pages')
        .select('id, page_number')
        .eq('edition_id', editionId)
        .in('page_number', pagesToCheck)

      console.log('book_pages data: ', data)
      
      if (error) throw error
      
      const prevPage = data?.find(p => p.page_number === currentPage - 1) || null
      const nextPage = data?.find(p => p.page_number === currentPage + 1) || null
      
      return { prevPage, nextPage }
    },
    enabled: !!editionId && totalPages > 0,
    staleTime: 0,
  })
} 