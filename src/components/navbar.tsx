'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { useAuth } from '@/lib/auth-context'
import { AuthDialog } from './auth-dialog'
import { UserMenu } from './user-menu'
import { ThemeToggle } from './ui/theme-toggle'
import { Menu, X } from 'lucide-react'

export function Navbar() {
  const { user, loading } = useAuth()
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
      <header className="border-b border-amber-200/30 dark:border-amber-500/20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MC</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-amber-700 dark:text-amber-400">
                  MirageCodex
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  The Infinite AI-Generated Library
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <a 
                href="/" 
                className="text-slate-700 hover:text-amber-700 dark:text-slate-300 dark:hover:text-amber-400 transition-colors"
              >
                Browse
              </a>
              <button
                onClick={handleSearchClick}
                className="text-slate-700 hover:text-amber-700 dark:text-slate-300 dark:hover:text-amber-400 transition-colors"
              >
                Search {!user && '(Login Required)'}
              </button>
              
              <ThemeToggle />
              
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
              className="md:hidden text-slate-700 dark:text-slate-300"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <nav className="md:hidden mt-4 pb-4 border-t border-amber-200/30 dark:border-amber-500/20 pt-4 space-y-2">
              <a 
                href="/" 
                className="block px-2 py-1 text-slate-700 hover:text-amber-700 dark:text-slate-300 dark:hover:text-amber-400 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Browse
              </a>
              <button
                onClick={() => {
                  handleSearchClick()
                  setIsMobileMenuOpen(false)
                }}
                className="block px-2 py-1 text-left text-slate-700 hover:text-amber-700 dark:text-slate-300 dark:hover:text-amber-400 transition-colors"
              >
                Search {!user && '(Login Required)'}
              </button>
              
              <div className="px-2 py-1">
                <ThemeToggle />
              </div>
              
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