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
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 relative">
      {/* Marble texture background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/marble_texture.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.24
        }}
      />
      
      <div className="w-full max-w-6xl mx-auto relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-8 md:mb-12 space-y-4 md:space-y-6">
          {/* Main Title - Mirage Codex */}
          <div className="relative">
            <div className="flex items-baseline justify-center">
              <h1
                className="text-4xl md:text-7xl lg:text-8xl font-bold text-[#1f2630] dark:text-amber-100 leading-tight tracking-wide"
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
              {/* Reduced gap and added subtle divider */}
              <div className="mx-2 md:mx-3 lg:mx-4 flex items-center">
                <div className="w-px h-8 md:h-16 lg:h-20 bg-[#B89C51] opacity-30"></div>
              </div>
              <h1
                className="text-4xl md:text-7xl lg:text-8xl font-bold text-[#B89C51] dark:text-[#D4AF37] leading-tight tracking-wide"
                style={{ fontFamily: 'var(--font-playfair-display), serif', letterSpacing: '0.1em' }}
              >
                Codex
              </h1>
            </div>

            {/* Subtitle Quote with hairline dividers */}
            <div className="mt-4 md:mt-6 space-y-3">
              {/* Top divider */}
              <div className="flex items-center justify-center">
                <div className="h-px bg-[#B89C51] opacity-20 w-8"></div>
              </div>
              
              <p
                className="text-lg md:text-xl lg:text-2xl text-slate-600 dark:text-amber-50/90 leading-relaxed font-light italic"
                style={{ fontFamily: 'var(--font-playfair-display), serif' }}
              >
                <span className="text-xl md:text-2xl lg:text-3xl text-[#B89C51] dark:text-[#D4AF37]">"</span>
                The simulacrum of a literary universe
                <span className="text-xl md:text-2xl lg:text-3xl text-[#B89C51] dark:text-[#D4AF37]">"</span>
              </p>
              
              {/* Bottom divider */}
              <div className="flex items-center justify-center">
                <div className="h-px bg-[#B89C51] opacity-20 w-8"></div>
              </div>
            </div>
          </div>

          {/* Poetic Description */}
          <div className="max-w-lg mx-auto space-y-3 md:space-y-4">
            <div className="backdrop-blur-sm bg-transparent rounded-2xl p-4 md:p-6 border border-[#B89C51]/10 dark:border-[#B89C51]/30">
              <p className="text-base md:text-lg text-slate-800 dark:text-amber-50 leading-relaxed max-w-2xl mx-auto">
                A living archive born from the collective imagination. Each query conjures phantom volumes, existing only in the space between dream and ink.
              </p>
            </div>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {/* Browse Mode - Primary */}
          <ModeCard
            mode="browse"
            title="Browse"
            subtitle="Read what others have summoned"
            icon={<Book className="w-8 h-8 md:w-10 md:h-10" />}
            description="Explore what others search. Memories of things to be."
            isPrimary={true}
            onClick={() => handleModeSelect('browse')}
          />
          
          {/* Search Mode - Secondary with lock */}
          <ModeCard
            mode="search"
            title="Search"
            subtitle={user ? "Cast your own spell" : "Cast your own spell (login required)"}
            icon={user ? <Search className="w-8 h-8 md:w-10 md:h-10" /> : <Lock className="w-8 h-8 md:w-10 md:h-10" />}
            description="Search through the mirage of possibilities."
            requiresAuth={!user}
            isPrimary={false}
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
  subtitle: string
  icon: React.ReactNode
  description: string
  requiresAuth?: boolean
  isPrimary?: boolean
  onClick: () => void
}

function ModeCard({ mode, title, subtitle, icon, description, requiresAuth, isPrimary, onClick }: ModeCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative overflow-hidden
        ${isPrimary 
          ? 'bg-[#B89C51] hover:bg-[#A76700] text-white' 
          : 'bg-amber-50/5 dark:bg-transparent hover:bg-amber-50/8 dark:hover:bg-transparent text-slate-600 dark:text-amber-100'
        }
        backdrop-blur-sm
        rounded-xl
        ${isPrimary 
          ? 'border border-[#A76700]/60' 
          : 'border border-[#A76700]/60 dark:border-amber-200/60'
        }
        p-4 md:p-6
        text-center
        transition-all duration-500 ease-out
        hover:scale-102 hover:shadow-2xl 
        hover:shadow-amber-900/8 dark:hover:shadow-amber-400/8
        ${!isPrimary && 'hover:border-amber-800/80 dark:hover:border-amber-100/80'}
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B89C51]/60
        min-h-[140px] md:min-h-[160px]
        flex flex-col items-center justify-center
        ${isPrimary ? 'min-h-[160px] md:min-h-[180px]' : ''}
      `}
    >
      {/* Radial glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 ease-out bg-gradient-radial from-[#B89C51] via-transparent to-transparent rounded-xl" />

      {/* Icon */}
      <div className={`mb-2 md:mb-3 transition-all duration-500 ease-out group-hover:scale-105 group-hover:-translate-y-2 ${
        isPrimary 
          ? 'text-white group-hover:text-amber-100' 
          : 'text-[#B89C51] dark:text-[#B89C51] group-hover:text-[#D4AF37]'
      }`}>
        <div className="w-8 h-8 md:w-10 md:h-10">
          {icon}
        </div>
      </div>

      {/* Title */}
      <h2
        className={`text-xl md:text-2xl font-semibold transition-all duration-500 ease-out group-hover:scale-105 group-hover:-translate-y-4 mb-2 ${
          isPrimary 
            ? 'text-white' 
            : 'text-slate-600 dark:text-amber-100'
        }`}
        style={{ 
          fontFamily: 'var(--font-playfair-display), serif',
          letterSpacing: '0.5px',
          fontWeight: 600,
          fontSize: isPrimary ? '1.25rem' : '1.125rem'
        }}
      >
        {title}
      </h2>

      {/* Subtitle */}
      <p className={`text-sm transition-all duration-300 ease-out mb-4 ${
        isPrimary 
          ? 'text-amber-100/90' 
          : 'text-slate-500 dark:text-amber-50/70'
      }`}
      style={{ letterSpacing: '0.5px' }}>
        {subtitle}
      </p>

      {/* Description - slides in from bottom on hover */}
      <div className={`
        transition-all duration-500 ease-out
        opacity-0 translate-y-6
        group-hover:opacity-100 group-hover:translate-y-0
        absolute bottom-4 md:bottom-6 left-3 right-3 md:left-4 md:right-4
      `}>
        <p className={`leading-relaxed text-center text-xs md:text-sm ${
          isPrimary 
            ? 'text-amber-100/80' 
            : 'text-slate-600 dark:text-amber-50/90'
        }`}>
          {requiresAuth
            ? 'Sign in to unlock search. Create unique books by searching them.'
            : description
          }
        </p>
      </div>

      {/* Subtle gradient overlay on hover for non-primary */}
      {!isPrimary && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-3 transition-opacity duration-500 ease-out bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl" />
      )}
    </button>
  )
}
