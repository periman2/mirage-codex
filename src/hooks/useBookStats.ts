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
export function useBookStats(bookId: string) {
  const supabase = createSupabaseBrowserClient()

  return useQuery<BookStats>({
    queryKey: ['book-stats', bookId],
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
    onSuccess: () => {
      // Invalidate and refetch book stats
      queryClient.invalidateQueries({ queryKey: ['book-stats', bookId] })
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
export function usePageStats(bookId: string, pageNumber: number, editionId?: string) {
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
    enabled: !!editionId,
    staleTime: 1 * 60 * 1000, // 1 minute
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
    onSuccess: (_, editionId) => {
      // Invalidate and refetch page stats
      queryClient.invalidateQueries({ 
        queryKey: ['page-stats', bookId, pageNumber, editionId] 
      })
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