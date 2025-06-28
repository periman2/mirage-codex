'use client'

import { useState } from 'react'
import { AuthDialog } from '@/components/auth-dialog'
import { useAuth } from '@/lib/auth-context'
import { Book, Search, Lock } from 'iconoir-react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/logo'

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
      <div className="w-full max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12 md:mb-16 space-y-6 md:space-y-8">
          {/* Main Title - Mirage Codex */}
          <div className="relative">
            <div className="flex items-baseline justify-center">
              <h1
                className="text-4xl md:text-7xl lg:text-8xl font-bold text-slate-700 dark:text-amber-100 leading-tight tracking-wide"
                style={{ fontFamily: 'var(--font-playfair-display), serif', letterSpacing: '0.1em' }}
              >
                M
                <span className="relative inline-flex items-center px-4">
                  <span className="opacity-0 text-4xl md:text-7xl lg:text-8xl">i</span>
                  <Logo
                    className="absolute w-20 md:w-40 lg:w-48 h-20 md:h-40 lg:h-48 object-cover filter brightness-0 dark:brightness-0 dark:invert"
                    style={{ top: '50%', left: '50%', transform: 'translate(-52%, -37%)' }}
                  />
                </span>
                rage
              </h1>
              <span className="mx-4 md:mx-6 lg:mx-8 text-4xl md:text-7xl lg:text-8xl font-bold text-slate-700 dark:text-amber-100"></span>
              <h1
                className="text-4xl md:text-7xl lg:text-8xl font-bold text-[#B89C51] dark:text-[#D4AF37] leading-tight tracking-wide"
                style={{ fontFamily: 'var(--font-playfair-display), serif', letterSpacing: '0.1em' }}
              >
                Codex
              </h1>
            </div>

            {/* Subtitle Quote */}
            <div className="mt-4 md:mt-6">
              <p
                className="text-lg md:text-xl lg:text-2xl text-slate-600 dark:text-amber-50/90 leading-relaxed font-light italic"
                style={{ fontFamily: 'var(--font-playfair-display), serif' }}
              >
                <span className="text-xl md:text-2xl lg:text-3xl text-[#B89C51] dark:text-[#D4AF37]">"</span>
                The simulacrum of a literary universe
                <span className="text-xl md:text-2xl lg:text-3xl text-[#B89C51] dark:text-[#D4AF37]">"</span>
              </p>
            </div>

            {/* Decorative line */}
            <div className="mt-6 md:mt-8 flex items-center justify-center">
              <div className="h-px bg-gradient-to-r from-transparent via-[#B89C51] to-transparent w-32 md:w-48"></div>
            </div>
          </div>

          {/* Poetic Description */}
          <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
            <div className="backdrop-blur-sm bg-white/20 dark:bg-amber-950/20 rounded-2xl p-6 md:p-8">
              <p className="text-base md:text-lg text-slate-800 dark:text-amber-50 leading-relaxed max-w-2xl mx-auto">
                A living archive born from the collective efforts of imaginative seekers. 
                Each query becomes a conjuration that births books 
                into being, phantom volumes that exist in the liminal space between 
                imagination and reality.
              </p>
              
              <p className="text-sm md:text-base text-slate-600 dark:text-amber-50/90 leading-relaxed max-w-xl mx-auto italic mt-4">
                Browse the dreams of others, or weave your own into the ever-expanding codex
              </p>
            </div>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="grid grid-cols-1 gap-6 max-w-2xl mx-auto">
          {/* Search Mode */}
          <ModeCard
            mode="search"
            title="Search"
            icon={user ? <Search className="w-8 h-8 md:w-10 md:h-10" /> : <Lock className="w-8 h-8 md:w-10 md:h-10" />}
            description="Search through the mirage of possibilities, become a part of the codex's becoming"
            requiresAuth={!user}
            onClick={() => handleModeSelect('search')}
          />
          {/* Browse Mode */}
          <ModeCard
            mode="browse"
            title="Browse"
            icon={<Book className="w-8 h-8 md:w-10 md:h-10" />}
            description="Explore what others search. Memories of things to be."
            onClick={() => handleModeSelect('browse')}
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
        bg-amber-50/5 dark:bg-transparent 
        backdrop-blur-sm
        rounded-xl
        border border-[#A76700]/60 dark:border-amber-200/60
        p-6 md:p-8
        text-center
        transition-all duration-500 ease-out
        hover:scale-102 hover:shadow-2xl 
        hover:shadow-amber-900/8 dark:hover:shadow-amber-400/8
        hover:bg-amber-50/8 dark:hover:bg-transparent
        hover:border-amber-800/80 dark:hover:border-amber-100/80
        focus:outline-none focus:ring-3 focus:ring-amber-200/50 dark:focus:ring-amber-500/20
        min-h-[140px] md:min-h-[160px]
        flex flex-col items-center justify-center
      `}
    >
      {/* Icon */}
      <div className="mb-3 md:mb-4 text-[#B89C51] dark:text-[#B89C51] transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-2">
        <div className="w-8 h-8 md:w-10 md:h-10">
          {icon}
        </div>
      </div>

      {/* Title - moves up on hover */}
      <h2
        className="text-xl md:text-2xl font-semibold text-slate-600 dark:text-amber-100 transition-all duration-500 ease-out group-hover:scale-105 group-hover:-translate-y-4 mb-2"
        style={{ fontFamily: 'var(--font-playfair-display), serif' }}
      >
        {requiresAuth ? 'Search' : title}
      </h2>

      {/* Description - slides in from bottom on hover */}
      <div className={`
        transition-all duration-500 ease-out
        opacity-0 translate-y-6
        group-hover:opacity-100 group-hover:translate-y-0
        absolute bottom-6 md:bottom-8 left-4 right-4 md:left-6 md:right-6
      `}>
        <p className="text-slate-600 dark:text-amber-50/90 text-xs md:text-sm leading-relaxed text-center">
          {requiresAuth
            ? 'Sign in to unlock search. Create unique books by searching them.'
            : description
          }
        </p>
      </div>

      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-3 transition-opacity duration-500 ease-out bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl" />
    </button>
  )
}
