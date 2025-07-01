'use client'

import { Coins, Spark } from 'iconoir-react'
import { useCredits } from '@/hooks/useCredits'
import { useAuth } from '@/lib/auth-context'

interface CreditsDisplayProps {
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'navbar' | 'pill'
  onClick?: () => void
}

export function CreditsDisplay({ 
  className = '', 
  showLabel = true, 
  size = 'md',
  variant = 'default',
  onClick 
}: CreditsDisplayProps) {
  const { user } = useAuth()
  const { credits, isLoading, error } = useCredits()

  if (!user) return null

  if (isLoading) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <Spark className={`${getSizeClasses(size)} text-amber-600 dark:text-amber-400 animate-pulse`} />
        {showLabel && (
          <span className={`${getTextSizeClasses(size)} text-slate-600 dark:text-slate-300 animate-pulse`}>
            ---
          </span>
        )}
      </div>
    )
  }

  if (error || !credits) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <Spark className={`${getSizeClasses(size)} text-red-500`} />
        {showLabel && (
          <span className={`${getTextSizeClasses(size)} text-red-500`}>
            Error
          </span>
        )}
      </div>
    )
  }

  const containerClasses = getVariantClasses(variant, size)
  const isClickable = !!onClick

  const content = (
    <>
      <Spark className={`${getSizeClasses(size)} text-amber-600 dark:text-amber-400 flex-shrink-0`} />
      {showLabel && (
        <span className={`${getTextSizeClasses(size)} text-slate-700 dark:text-slate-200 font-medium`}>
          {credits.credits.toLocaleString()}
        </span>
      )}
    </>
  )

  if (isClickable) {
    return (
      <button
        onClick={onClick}
        className={`${containerClasses} ${className} hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors cursor-pointer`}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={`${containerClasses} ${className}`}>
      {content}
    </div>
  )
}

function getSizeClasses(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm':
      return 'w-4 h-4'
    case 'md':
      return 'w-5 h-5'
    case 'lg':
      return 'w-6 h-6'
  }
}

function getTextSizeClasses(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm':
      return 'text-xs'
    case 'md':
      return 'text-sm'
    case 'lg':
      return 'text-base'
  }
}

function getVariantClasses(variant: 'default' | 'navbar' | 'pill', size: 'sm' | 'md' | 'lg'): string {
  const baseClasses = 'flex items-center gap-1.5'
  
  switch (variant) {
    case 'navbar':
      return `${baseClasses} px-2 py-1 rounded-md bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/50`
    case 'pill':
      return `${baseClasses} px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700`
    default:
      return baseClasses
  }
} 