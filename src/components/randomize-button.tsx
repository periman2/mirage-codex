'use client'

import { Button } from '@/components/ui/button'
import { DiceFive } from 'iconoir-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface RandomizeButtonProps {
  variant?: 'default' | 'outline'
}

export function RandomizeButton({ variant = 'default' }: RandomizeButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleRandomize = async () => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Found a new book recommendation!')
    } catch (error) {
      toast.error('Failed to get recommendation')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleRandomize}
      disabled={isLoading}
      variant={variant}
      className={variant === 'default' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700' : ''}
    >
      <DiceFive className={`w-5 h-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
      {isLoading ? 'Discovering...' : 'Randomize'}
    </Button>
  )
} 