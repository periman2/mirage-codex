import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from './supabase'
import { getProfile, updateProfile, type Profile } from './auth'
import type { User } from '@supabase/supabase-js'

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
  profile: (userId: string) => [...authKeys.all, 'profile', userId] as const,
}

// Get current user session
export function useUser() {
  const supabase = createSupabaseBrowserClient()
  
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      return session?.user || null
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get user profile
export function useProfile(userId?: string) {
  return useQuery({
    queryKey: authKeys.profile(userId || ''),
    queryFn: () => {
      if (!userId) throw new Error('User ID required')
      return getProfile(userId)
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Update user profile
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Partial<Profile> }) =>
      updateProfile(userId, updates),
    onSuccess: (data, { userId }) => {
      // Update the profile cache
      queryClient.setQueryData(authKeys.profile(userId), data)
      // Invalidate to refetch
      queryClient.invalidateQueries({ queryKey: authKeys.profile(userId) })
    },
  })
}

// Listen to auth state changes
export function useAuthStateChange() {
  const queryClient = useQueryClient()
  const supabase = createSupabaseBrowserClient()

  return {
    subscribe: () => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          // Update user cache
          queryClient.setQueryData(authKeys.user(), session?.user || null)
          
          if (event === 'SIGNED_OUT') {
            // Clear all auth-related caches on sign out
            queryClient.removeQueries({ queryKey: authKeys.all })
          } else if (session?.user && event === 'SIGNED_IN') {
            // Prefetch profile on sign in
            queryClient.prefetchQuery({
              queryKey: authKeys.profile(session.user.id),
              queryFn: () => getProfile(session.user.id),
            })
          }
        }
      )
      
      return subscription
    }
  }
} 