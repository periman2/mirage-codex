'use client'

import { createContext, useContext, useEffect } from 'react'
import { createSupabaseBrowserClient } from './supabase'
import { useUser, useProfile, useAuthStateChange } from './auth-queries'
import type { Profile, AuthUser } from './auth'

interface AuthContextType {
  user: AuthUser | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseBrowserClient()
  const authStateChange = useAuthStateChange()
  
  // Use React Query for user and profile data
  const { data: user, isLoading: userLoading } = useUser()
  const { data: profile, isLoading: profileLoading, refetch: refreshProfile } = useProfile(user?.id)

  const loading = userLoading || (user && profileLoading)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  // Set up auth state listener
  useEffect(() => {
    const subscription = authStateChange.subscribe()
    return () => subscription.unsubscribe()
  }, [])

  const value = {
    user: user as AuthUser | null,
    profile: profile || null,
    loading: !!loading,
    signOut: handleSignOut,
    refreshProfile: () => {
      refreshProfile()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 