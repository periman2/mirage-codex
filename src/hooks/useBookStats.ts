import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase'

interface BookStats {
  likes: number
  views: number
  userLiked: boolean
}

interface ViewTrackingData {
  sessionId?: string
  editionId?: string
}

// Hook for getting book stats
export function useBookStats(bookId: string, enabled: boolean) {
  const supabase = createSupabaseBrowserClient()

  return useQuery<BookStats>({
    queryKey: ['book-stats', bookId],
    enabled: !!bookId && enabled,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = {}
      
      if (session?.access_token) {
        headers.authorization = `Bearer ${session.access_token}`
      }

      const response = await fetch(`/api/book/${bookId}/like`, {
        headers
      })

      if (!response.ok) {
        throw new Error('Failed to fetch book stats')
      }

      return response.json()
    },
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: false
  })
}

// Hook for liking/unliking books
export function useBookLike(bookId: string) {
  const supabase = createSupabaseBrowserClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`/api/book/${bookId}/like`, {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${session.access_token}`,
          'content-type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to toggle like')
      }

      return response.json()
    },
    onSuccess: (data) => {
      // Update the cache directly instead of invalidating (prevents the GET refetch)
      queryClient.setQueryData(
        ['book-stats', bookId], 
        (oldData: any) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            userLiked: data.liked,
            likes: data.likes
          }
        }
      )
    }
  })
}

// Hook for tracking book views
export function useBookView(bookId: string) {

  const supabase = createSupabaseBrowserClient()
  const [hasTrackedView, setHasTrackedView] = useState(false)

  const trackView = async (data?: ViewTrackingData) => {
    if (hasTrackedView) return // Prevent duplicate tracking

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = {
        'content-type': 'application/json'
      }
      
      if (session?.access_token) {
        headers.authorization = `Bearer ${session.access_token}`
      }

      const response = await fetch(`/api/book/${bookId}/view`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId: data?.sessionId || crypto.randomUUID(),
          ...data
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.counted) {
          setHasTrackedView(true)
        }
      }
    } catch (error) {
      console.error('Failed to track book view:', error)
    }
  }

  return { trackView, hasTrackedView }
}

// Hook for getting page stats
export function usePageStats(bookId: string, pageNumber: number, editionId: string | undefined, enabled: boolean) {
  const supabase = createSupabaseBrowserClient()

  return useQuery<BookStats>({
    queryKey: ['page-stats', bookId, pageNumber, editionId],
    queryFn: async () => {
      if (!editionId) {
        throw new Error('Edition ID required for page stats')
      }

      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = {}
      
      if (session?.access_token) {
        headers.authorization = `Bearer ${session.access_token}`
      }

      const response = await fetch(
        `/api/book/${bookId}/page/${pageNumber}/like?editionId=${editionId}`,
        { headers }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch page stats')
      }

      return response.json()
    },
    enabled: !!editionId && enabled,
    staleTime: 0,
    refetchOnWindowFocus: false
  })
}

// Hook for liking/unliking pages
export function usePageLike(bookId: string, pageNumber: number) {
  const supabase = createSupabaseBrowserClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (editionId: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`/api/book/${bookId}/page/${pageNumber}/like`, {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${session.access_token}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ editionId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to toggle like')
      }

      return response.json()
    },
    onSuccess: (data, editionId) => {
      // Update the cache directly instead of invalidating (prevents the GET refetch)
      queryClient.setQueryData(
        ['page-stats', bookId, pageNumber, editionId], 
        (oldData: any) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            userLiked: data.liked,
            likes: data.likes
          }
        }
      )
    }
  })
}

// Hook for tracking page views
export function usePageView(bookId: string, pageNumber: number) {
  const supabase = createSupabaseBrowserClient()
  const [hasTrackedView, setHasTrackedView] = useState(false)

  const trackView = async (editionId: string, sessionId?: string) => {
    if (hasTrackedView) return // Prevent duplicate tracking

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = {
        'content-type': 'application/json'
      }
      
      if (session?.access_token) {
        headers.authorization = `Bearer ${session.access_token}`
      }

      const response = await fetch(`/api/book/${bookId}/page/${pageNumber}/view`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          editionId,
          sessionId: sessionId || crypto.randomUUID()
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.counted) {
          setHasTrackedView(true)
        }
      }
    } catch (error) {
      console.error('Failed to track page view:', error)
    }
  }

  return { trackView, hasTrackedView }
}

// Hook for loading page content
export function usePageContent(
  bookId: string, 
  pageNumber: number, 
  editionId: string | undefined, 
  enabled: boolean,
  onSuccess?: (data: { exists: boolean; content: string | null }) => void,
  onError?: (error: Error) => void
) {
  return useQuery<{ exists: boolean; content: string | null }>({
    queryKey: ['page-content', bookId, pageNumber, editionId],
    queryFn: async () => {
      try {
        
        if (!editionId) {
          throw new Error('Edition ID required for page content')
        }

        const response = await fetch(
          `/api/book/${bookId}/page/${pageNumber}?editionId=${editionId}`
        )

        if (!response.ok) {
          throw new Error('Failed to load page content')
        }

        const data = await response.json();
        // console.log('✅ usePageContent queryFn success', data);
        
        // Call success callback if provided
        if (onSuccess) {
          try {
            await onSuccess(data);
          } catch (callbackError) {
            console.error('❌ onSuccess callback error:', callbackError);
          }
        }
        
        return data;
      } catch (error) {
        console.error('❌ usePageContent queryFn error:', error);
        
        // Call error callback if provided
        if (onError && error instanceof Error) {
          try {
            onError(error);
          } catch (callbackError) {
            console.error('❌ onError callback error:', callbackError);
          }
        }
        
        throw error;
      }
    },
    enabled: !!bookId && !!pageNumber && !!editionId && enabled,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: 1 // Only retry once for page content
  })
}

// Hook for loading existing bookmark for current page
export function useBookmark(userId: string | undefined, editionId: string | undefined, pageNumber: number, enabled: boolean) {
  const supabase = createSupabaseBrowserClient()

  return useQuery<{ id: number; note: string | null } | null>({
    queryKey: ['bookmark', userId, editionId, pageNumber],
    queryFn: async () => {
      if (!userId || !editionId) {
        return null
      }

      const { data, error } = await supabase
        .from('bookmarks')
        .select('id, note')
        .eq('user_id', userId)
        .eq('edition_id', editionId)
        .eq('page_number', pageNumber)
        .limit(1)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error loading bookmark:', error)
        throw error
      }

      return data
    },
    enabled: !!userId && !!editionId && !!pageNumber && enabled,
    staleTime: 0,
    refetchOnWindowFocus: false
  })
}