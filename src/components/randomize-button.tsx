'use client'

import { Button } from '@/components/ui/button'
import { Dice6 } from 'lucide-react'
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
      // Simulate random book discovery
      await new Promise(resolve => setTimeout(resolve, 500))
      toast.success('Discovered new books!')
      // In real implementation, this would trigger a random book search
    } catch (error) {
      toast.error('Failed to discover books')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleRandomize}
      disabled={isLoading}
      variant={variant}
      size="lg"
      className={variant === 'default' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700' : ''}
    >
      <Dice6 className={`w-5 h-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
      {isLoading ? 'Discovering...' : 'Randomize'}
    </Button>
  )
} 