'use client'

import { useState } from 'react'
import { AuthDialog } from '@/components/auth-dialog'
import { useAuth } from '@/lib/auth-context'
import { BookOpen, Search, Lock } from 'lucide-react'
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
            icon={<BookOpen className="w-12 h-12 md:w-16 md:h-16" />}
            description="Explore the infinite library of AI-generated books. Discover stories created by others, filter by genres, and dive into endless fictional worlds."
            onClick={() => handleModeSelect('browse')}
          />

          {/* Search Mode */}
          <ModeCard
            mode="search"
            title="Search"
            icon={user ? <Search className="w-12 h-12 md:w-16 md:h-16" /> : <Lock className="w-12 h-12 md:w-16 md:h-16" />}
            description="Create new books with AI. Enter your ideas, choose genres and themes, and watch as unique stories are generated just for you."
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
        bg-amber-50/70 dark:bg-slate-800/70 
        backdrop-blur-sm
        rounded-2xl
        border-2 border-amber-200/60 dark:border-amber-500/30
        p-8 md:p-10
        text-center
        transition-all duration-500 ease-out
        hover:scale-105 hover:shadow-2xl 
        hover:shadow-amber-900/20 dark:hover:shadow-amber-400/10
        hover:bg-amber-50/90 dark:hover:bg-slate-800/90
        hover:border-amber-300/80 dark:hover:border-amber-400/50
        focus:outline-none focus:ring-4 focus:ring-amber-200 dark:focus:ring-amber-500/30
        min-h-[200px] md:min-h-[240px]
        flex flex-col items-center justify-center
      `}
    >
      {/* Icon */}
      <div className="mb-4 md:mb-6 text-amber-600 dark:text-amber-400 transition-all duration-500 ease-out group-hover:scale-110">
        {icon}
      </div>

      {/* Title */}
      <h2 className="text-3xl md:text-5xl font-bold text-slate-800 dark:text-amber-300 transition-all duration-500 ease-out group-hover:scale-105 mb-2">
        {requiresAuth ? 'Search' : title}
      </h2>

      {/* Description - Hidden by default, shown on hover */}
      <div className={`
        absolute inset-0 
        flex items-center justify-center
        bg-amber-50/95 dark:bg-slate-800/95
        backdrop-blur-sm
        rounded-2xl
        p-6 md:p-8
        opacity-0 translate-y-4
        group-hover:opacity-100 group-hover:translate-y-0
        transition-all duration-500 ease-out
        pointer-events-none
      `}>
        <p className="text-slate-700 dark:text-slate-300 text-sm md:text-base leading-relaxed text-center">
          {requiresAuth 
            ? 'Sign in to unlock AI-powered book generation. Create unique stories tailored to your imagination.'
            : description
          }
        </p>
      </div>

      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 ease-out bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl" />
    </button>
  )
}
