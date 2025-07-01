import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseBrowserClient } from '@/lib/supabase'

export interface UserCredits {
  credits: number
  credits_used_this_month: number
  credits_reset_at: string
  plan_name: string
  plan_slug: string
  plan_description: string
  plan_credits_per_month: number
  plan_price_cents: number
}

export const CREDITS_QUERY_KEY = 'user-credits'

export function useCredits() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: [CREDITS_QUERY_KEY, user?.id],
    queryFn: async (): Promise<UserCredits> => {
      if (!user) throw new Error('User not authenticated')
      
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase
        .rpc('get_user_billing_info', { p_user_id: user.id })

      if (error) throw error
      if (!data || data.length === 0) throw new Error('No billing info found')

      return data[0]
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  })

  const invalidateCredits = () => {
    queryClient.invalidateQueries({ 
      queryKey: [CREDITS_QUERY_KEY, user?.id] 
    })
  }

  const refetchCredits = () => {
    return query.refetch()
  }

  return {
    ...query,
    credits: query.data,
    invalidateCredits,
    refetchCredits,
  }
} 