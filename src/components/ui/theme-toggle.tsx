'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { SunLight, HalfMoon } from 'iconoir-react'
import { Button } from './button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="w-9 h-9 p-0">
        <div className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="w-9 h-9 p-0"
    >
      {theme === 'dark' ? (
        <SunLight className="h-4 w-4" />
      ) : (
        <HalfMoon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
} 