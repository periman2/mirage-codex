'use client'

import { useState, useImperativeHandle, forwardRef } from 'react'
import { Button } from './ui/button'
import { AuthDialog } from './auth-dialog'
import { useAuth } from '@/lib/auth-context'

interface AuthButtonProps {
  /**
   * Callback function to execute after successful sign-in
   * If not provided, page will reload by default
   */
  onSignInSuccess?: () => void
  /**
   * Button text to display
   */
  children?: React.ReactNode
  /**
   * Button variant
   */
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary'
  /**
   * Button size
   */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /**
   * Additional CSS classes
   */
  className?: string
  /**
   * Custom button styles
   */
  style?: React.CSSProperties
  /**
   * Whether the button should take full width
   */
  fullWidth?: boolean
  /**
   * If true, renders only the AuthDialog without a visible button
   * The dialog can be opened via the exposed ref methods
   */
  invisible?: boolean
}

export interface AuthButtonRef {
  openAuth: () => void
  closeAuth: () => void
}

export const AuthButton = forwardRef<AuthButtonRef, AuthButtonProps>(({
  onSignInSuccess,
  children = 'Sign In',
  variant = 'default',
  size = 'default',
  className = '',
  style,
  fullWidth = false,
  invisible = false
}, ref) => {
  const { user, loading } = useAuth()
  const [isAuthOpen, setIsAuthOpen] = useState(false)

  // Expose methods via ref for invisible mode
  useImperativeHandle(ref, () => ({
    openAuth: () => setIsAuthOpen(true),
    closeAuth: () => setIsAuthOpen(false)
  }))

  // Don't render anything if user is already signed in
  if (user || loading) {
    return null
  }

  const handleSignInSuccess = () => {
    setIsAuthOpen(false)
    
    if (onSignInSuccess) {
      // Use custom callback if provided
      onSignInSuccess()
    } else {
      // Default behavior: reload the page
      window.location.reload()
    }
  }

  return (
    <>
      {!invisible && (
        <Button
          onClick={() => setIsAuthOpen(true)}
          variant={variant}
          size={size}
          className={`${fullWidth ? 'w-full' : ''} ${className}`}
          style={style}
        >
          {children}
        </Button>
      )}

      <AuthDialog
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSignInSuccess={handleSignInSuccess}
      />
    </>
  )
}) 