'use client'

import { AuthButton, type AuthButtonRef } from '@/components/auth-button'
import { useAuth } from '@/lib/auth-context'
import { Book, Search, Lock } from 'iconoir-react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/logo'
import { useRef } from 'react'

export default function HomePage() {
  const { user } = useAuth()
  const router = useRouter()

  const handleModeSelect = (mode: 'browse' | 'search') => {
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
          backgroundImage: 'url(https://nxdsudkpprqhmvesftzp.supabase.co/storage/v1/object/public/app/background/marble_texture.jpg)',
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
                <div className="w-px h-8 md:h-16 lg:h-20 opacity-30" style={{ backgroundColor: 'rgb(217 119 6)' }}></div>
              </div>
              <h1
                className="text-4xl md:text-7xl lg:text-8xl font-bold leading-tight tracking-wide"
                style={{ 
                  fontFamily: 'var(--font-playfair-display), serif', 
                  letterSpacing: '0.1em',
                  color: 'rgb(217 119 6)'
                }}
              >
                Codex
              </h1>
            </div>

            {/* Subtitle Quote with hairline dividers */}
            <div className="mt-4 md:mt-6 space-y-3">
              {/* Top divider */}
              <div className="flex items-center justify-center">
                <div className="h-px opacity-20 w-8" style={{ backgroundColor: 'rgb(217 119 6)' }}></div>
              </div>
              
              <p
                className="text-lg md:text-xl lg:text-2xl text-slate-600 dark:text-amber-50/90 leading-relaxed font-light italic"
                style={{ fontFamily: 'var(--font-playfair-display), serif' }}
              >
                <span className="text-xl md:text-2xl lg:text-3xl" style={{ color: 'rgb(217 119 6)' }}>"</span>
                The simulacrum of a literary universe
                <span className="text-xl md:text-2xl lg:text-3xl" style={{ color: 'rgb(217 119 6)' }}>"</span>
              </p>
              
              {/* Bottom divider */}
              <div className="flex items-center justify-center">
                <div className="h-px opacity-20 w-8" style={{ backgroundColor: 'rgb(217 119 6)' }}></div>
              </div>
            </div>
          </div>

          {/* Poetic Description */}
          <div className="max-w-2xl mx-auto space-y-3 md:space-y-4">
            <div 
              className="backdrop-blur-sm bg-transparent rounded-2xl p-4 md:p-6 border"
              style={{ borderColor: 'rgba(217, 119, 6, 0.1)' }}
            >
              <p className="text-base md:text-lg text-slate-800 dark:text-amber-50 leading-relaxed max-w-3xl mx-auto mb-4">
                A living archive born from the collective imagination. 
                <br />
                This library is been generated while you are searching inside of it.
              </p>
              
              {/* Learn More Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => router.push('/about')}
                  className="text-sm text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 transition-colors duration-300 underline underline-offset-4 decoration-1 hover:decoration-2"
                  style={{ fontFamily: 'var(--font-playfair-display), serif' }}
                >
                  Learn More
                </button>
              </div>
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
            description="Explore what others search."
            isPrimary={true}
            onClick={() => handleModeSelect('browse')}
          />
          
          {/* Search Mode - Secondary with lock or direct access */}
          <ModeCard
            mode="search"
            title="Search"
            subtitle={user ? "Cast your own spell" : "Cast your own spell (login required)"}
            icon={user ? <Search className="w-8 h-8 md:w-10 md:h-10" /> : <Lock className="w-8 h-8 md:w-10 md:h-10" />}
            description="Search through the mirage of possibilities."
            requiresAuth={!user}
            isPrimary={false}
            onClick={() => handleModeSelect('search')}
            onSignInSuccess={() => router.push('/search')}
          />
        </div>
      </div>


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
  onSignInSuccess?: () => void
}

function ModeCard({ mode, title, subtitle, icon, description, requiresAuth, isPrimary, onClick, onSignInSuccess }: ModeCardProps) {
  const authButtonRef = useRef<AuthButtonRef>(null)

  const handleCardClick = () => {
    if (requiresAuth) {
      authButtonRef.current?.openAuth()
    } else {
      onClick()
    }
  }

  const cardContent = (
    <>
      {/* Radial glow effect on hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 ease-out rounded-xl"
        style={{
          background: 'radial-gradient(circle, rgb(217 119 6), transparent, transparent)'
        }}
      />

      {/* Icon */}
      <div 
        className={`mb-2 md:mb-3 transition-all duration-500 ease-out group-hover:scale-105 group-hover:-translate-y-2 ${
          isPrimary 
            ? 'text-white group-hover:text-amber-100' 
            : ''
        }`}
        style={!isPrimary ? { color: 'rgb(217 119 6)' } : {}}
      >
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
            ? 'Create unique books by searching them.'
            : description
          }
        </p>
      </div>

      {/* Invisible Auth Button for search mode when not authenticated */}
      {requiresAuth && mode === 'search' && (
        <AuthButton
          ref={authButtonRef}
          onSignInSuccess={onSignInSuccess}
          invisible={true}
        />
      )}

      {/* Subtle gradient overlay on hover for non-primary */}
      {!isPrimary && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-3 transition-opacity duration-500 ease-out bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl" />
      )}
    </>
  )

  return (
    <button
      onClick={handleCardClick}
      className={`
        group relative overflow-hidden
        ${isPrimary 
          ? 'text-white' 
          : 'bg-amber-50/5 dark:bg-transparent hover:bg-amber-50/8 dark:hover:bg-transparent text-slate-600 dark:text-amber-100'
        }
        backdrop-blur-sm
        rounded-xl
        border
        p-4 md:p-6
        text-center
        transition-all duration-500 ease-out
        hover:scale-102 hover:shadow-2xl 
        hover:shadow-amber-900/8 dark:hover:shadow-amber-400/8
        ${!isPrimary && 'hover:border-amber-800/80 dark:hover:border-amber-100/80'}
        w-full h-44 md:h-48 min-h-[11rem]
      `}
      style={{
        backgroundColor: isPrimary ? 'rgb(217 119 6)' : undefined,
        borderColor: isPrimary ? 'rgb(217 119 6)' : 'rgba(217, 119, 6, 0.3)',
      }}
    >
      {cardContent}
    </button>
  )
}
