'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { signIn, signUp, resetPassword } from '@/lib/auth'
import { toast } from 'sonner'

interface AuthDialogProps {
  isOpen: boolean
  onClose: () => void
  defaultMode?: 'login' | 'signup'
  onSignInSuccess?: () => void
}

export function AuthDialog({ isOpen, onClose, defaultMode = 'login', onSignInSuccess }: AuthDialogProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(defaultMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('') // Clear any previous errors

    try {
      if (mode === 'login') {
        await signIn(email, password)
        toast.success('Welcome back!')
        if (onSignInSuccess) {
          onSignInSuccess()
        } else {
          onClose()
        }
      } else if (mode === 'signup') {
        await signUp(email, password, displayName)
        toast.success('Account created! Please check your email to verify your account.')
        if (onSignInSuccess) {
          onSignInSuccess()
        } else {
          onClose()
        }
      } else if (mode === 'forgot') {
        await resetPassword(email)
        toast.success('Password reset email sent! Check your inbox.')
        setMode('login')
      }
    } catch (error: any) {
      console.error('Auth error:', error)
      
      // Handle specific Supabase auth errors
      let errorMessage = 'An error occurred'
      
      if (error.message) {
        errorMessage = error.message
      } else if (error.error_description) {
        errorMessage = error.error_description
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      // Customize messages for common errors
      if (error.code === 'invalid_credentials' || errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.'
      } else if (error.code === 'email_not_confirmed') {
        errorMessage = 'Please check your email and click the confirmation link before signing in.'
      } else if (error.code === 'too_many_requests') {
        errorMessage = 'Too many attempts. Please wait a moment before trying again.'
      } else if (error.code === 'weak_password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.'
      } else if (error.code === 'user_already_exists') {
        errorMessage = 'An account with this email already exists. Try signing in instead.'
      }
      
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setDisplayName('')
    setError('')
  }

  const switchMode = (newMode: 'login' | 'signup' | 'forgot') => {
    setMode(newMode)
    resetForm()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'login' && 'Welcome back'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'forgot' && 'Reset your password'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'login' && 'Sign in to your MirageCodex account'}
            {mode === 'signup' && 'Join MirageCodex to unlock AI-powered book generation'}
            {mode === 'forgot' && 'Enter your email to receive a password reset link'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
          
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {mode !== 'forgot' && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Please wait...' : 
              mode === 'login' ? 'Sign In' :
              mode === 'signup' ? 'Create Account' :
              'Send Reset Link'
            }
          </Button>
        </form>

        <div className="text-center space-y-2">
          {mode === 'login' && (
            <>
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Forgot your password?
              </button>
              <div className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-foreground hover:underline"
                >
                  Sign up
                </button>
              </div>
            </>
          )}

          {mode === 'signup' && (
            <div className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-foreground hover:underline"
              >
                Sign in
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="text-sm text-muted-foreground">
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-foreground hover:underline"
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 