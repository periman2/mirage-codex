import { createSupabaseBrowserClient } from './supabase'
import type { User } from '@supabase/supabase-js'
import type { Tables } from './database.types'

export interface AuthUser extends User {}

export type Profile = Tables<'profiles'>

export async function signUp(email: string, password: string, displayName?: string) {
  const supabase = createSupabaseBrowserClient()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        display_name: displayName,
      },
    },
  })

  if (error) throw error

  // Profile will be created automatically via database trigger
  return data
}

export async function signIn(email: string, password: string) {
  const supabase = createSupabaseBrowserClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function signOut() {
  const supabase = createSupabaseBrowserClient()
  
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function resetPassword(email: string) {
  const supabase = createSupabaseBrowserClient()
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })

  if (error) throw error
}

export async function updatePassword(newPassword: string) {
  const supabase = createSupabaseBrowserClient()
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) throw error
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const supabase = createSupabaseBrowserClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createSupabaseBrowserClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Profile doesn't exist, return null
      return null
    }
    throw error
  }

  return data
} 