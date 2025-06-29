'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { useAuth } from '@/lib/auth-context'
import { AuthDialog } from './auth-dialog'
import { UserMenu } from './user-menu'

import { Menu, Xmark } from 'iconoir-react'

export function Navbar() {
  const { user, loading } = useAuth()
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      setIsScrolled(scrollTop > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSearchClick = () => {
    if (!user) {
      setIsAuthOpen(true)
    } else {
      // Navigate to search page
      window.location.href = '/search'
    }
  }

  return (
    <>
      <header className={`
        border-b border-amber-200/30 dark:border-amber-200/40 
        sticky top-0 z-50 
        transition-all duration-300 ease-out
        shadow-sm
        ${isScrolled 
          ? 'bg-white/90 dark:bg-amber-950/90 backdrop-blur-md shadow-md' 
          : 'bg-white/80 dark:bg-amber-950/80 backdrop-blur-sm'
        }
        h-16
      `}>
        <div className="container mx-auto px-4 py-2 h-full">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center relative">
              {/* Logo container with absolute positioning */}
              <div className="relative w-12 h-12">
                <a 
                  href="/" 
                  className="absolute top-1/2 left-0 transform -translate-y-1/2 w-20 h-20 flex items-center justify-center hover:opacity-80 transition-opacity z-10"
                >
                  <img 
                    src="/logo.svg" 
                    alt="MirageCodex Logo" 
                    className="w-20 h-20 object-contain filter brightness-0 dark:brightness-0 dark:invert drop-shadow-sm"
                  />
                </a>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <a 
                href="/browse" 
                className="text-sm text-slate-700 hover:text-amber-700 dark:text-amber-100 dark:hover:text-amber-200 transition-colors"
              >
                Browse
              </a>
              <button
                onClick={handleSearchClick}
                className="text-sm text-slate-700 hover:text-amber-700 dark:text-amber-100 dark:hover:text-amber-200 transition-colors"
              >
                Search {!user && '(Login Required)'}
              </button>
              
              {loading ? (
                <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-800 animate-pulse" />
              ) : user ? (
                <UserMenu />
              ) : (
                <Button onClick={() => setIsAuthOpen(true)} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                  Sign In
                </Button>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-slate-700 dark:text-amber-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <Xmark className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <nav className="md:hidden absolute left-0 right-0 top-full bg-white/95 dark:bg-amber-950/95 backdrop-blur-md border-b border-amber-200/30 dark:border-amber-200/40 px-4 py-3 space-y-2 shadow-sm">
              <a 
                href="/" 
                className="block px-2 py-1 text-sm text-slate-700 hover:text-amber-700 dark:text-amber-100 dark:hover:text-amber-200 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Browse
              </a>
              <button
                onClick={() => {
                  handleSearchClick()
                  setIsMobileMenuOpen(false)
                }}
                className="block px-2 py-1 text-left text-sm text-slate-700 hover:text-amber-700 dark:text-amber-100 dark:hover:text-amber-200 transition-colors"
              >
                Search {!user && '(Login Required)'}
              </button>
              
              {loading ? (
                <div className="px-2 py-1">
                  <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-800 animate-pulse" />
                </div>
              ) : user ? (
                <div className="px-2 py-1">
                  <UserMenu />
                </div>
              ) : (
                <div className="px-2 py-1">
                  <Button 
                    onClick={() => {
                      setIsAuthOpen(true)
                      setIsMobileMenuOpen(false)
                    }} 
                    size="sm"
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Sign In
                  </Button>
                </div>
              )}
            </nav>
          )}
        </div>
      </header>

      <AuthDialog 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
      />
    </>
  )
} 