'use client'

import { useState } from 'react'
import { AuthDialog } from '@/components/auth-dialog'
import { useAuth } from '@/lib/auth-context'
import { Book, Search, Lock } from 'iconoir-react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const { user } = useAuth()
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const router = useRouter()

  const handleModeSelect = (mode: 'browse' | 'search') => {
    if (mode === 'search' && !user) {
      setIsAuthOpen(true)
      return
    }
    
    if (mode === 'browse') {
      router.push('/browse')
    } else {
      router.push('/search')
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4">
      <div className="w-full max-w-2xl mx-auto">
        {/* Mode Selection */}
        <div className="grid grid-cols-1 gap-6">
          {/* Browse Mode */}
          <ModeCard
            mode="browse"
            title="Browse"
            icon={<Book className="w-12 h-12 md:w-16 md:h-16" />}
            description="Explore what others search. Memories of things to be."
            onClick={() => handleModeSelect('browse')}
          />

          {/* Search Mode */}
          <ModeCard
            mode="search"
            title="Search"
            icon={user ? <Search className="w-12 h-12 md:w-16 md:h-16" /> : <Lock className="w-12 h-12 md:w-16 md:h-16" />}
            description="Search through the mirage of possibilities, become a part of the library's becoming"
            requiresAuth={!user}
            onClick={() => handleModeSelect('search')}
          />
        </div>
      </div>

      <AuthDialog 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
      />
    </div>
  )
}

interface ModeCardProps {
  mode: 'browse' | 'search'
  title: string
  icon: React.ReactNode
  description: string
  requiresAuth?: boolean
  onClick: () => void
}

function ModeCard({ mode, title, icon, description, requiresAuth, onClick }: ModeCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative overflow-hidden
        bg-amber-50/20 dark:bg-transparent 
        backdrop-blur-sm
        rounded-3xl
        border-2 border-amber-900/80 dark:border-amber-200/90
        p-8 md:p-10
        text-center
        transition-all duration-500 ease-out
        hover:scale-105 hover:shadow-2xl 
        hover:shadow-amber-900/20 dark:hover:shadow-amber-400/10
        hover:bg-amber-50/35 dark:hover:bg-transparent
        hover:border-amber-800/90 dark:hover:border-amber-100/95
        focus:outline-none focus:ring-4 focus:ring-amber-200 dark:focus:ring-amber-500/30
        min-h-[200px] md:min-h-[240px]
        flex flex-col items-center justify-center
      `}
    >
      {/* Icon */}
      <div className="mb-4 md:mb-6 text-amber-600 dark:text-amber-400 transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-3">
        {icon}
      </div>

      {/* Title - moves up on hover */}
      <h2 
        className="text-2xl md:text-3xl font-bold text-slate-600 dark:text-amber-100 transition-all duration-500 ease-out group-hover:scale-105 group-hover:-translate-y-6 mb-2"
        style={{ fontFamily: 'var(--font-playfair-display), serif' }}
      >
        {requiresAuth ? 'Search' : title}
      </h2>

      {/* Description - slides in from bottom on hover */}
      <div className={`
        transition-all duration-500 ease-out
        opacity-0 translate-y-8
        group-hover:opacity-100 group-hover:translate-y-0
        absolute bottom-8 md:bottom-10 left-6 right-6 md:left-8 md:right-8
      `}>
        <p className="text-slate-600 dark:text-amber-50 text-sm md:text-base leading-relaxed text-center">
          {requiresAuth 
            ? 'Sign in to unlock search. Create unique books by searching them.'
            : description
          }
        </p>
      </div>

      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 ease-out bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl" />
    </button>
  )
}
