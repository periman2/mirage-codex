'use client'

import { Button } from '@/components/ui/button'
import { DiceFive } from 'iconoir-react'
import { useRandomBook } from '@/lib/queries'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface RandomizeButtonProps {
  variant?: 'default' | 'outline'
  className?: string
  style?: React.CSSProperties
}

export function RandomizeButton({ 
  variant = 'default', 
  className = '',
  style = {} 
}: RandomizeButtonProps) {
  const router = useRouter()
  const randomBookQuery = useRandomBook()

  const handleRandomize = async () => {
    try {
      // Trigger the random book query
      const result = await randomBookQuery.refetch()
      
      if (result.data) {
        toast.success(`Discovered "${result.data.title}" by ${result.data.author.penName}!`)
        // Navigate to the random book
        router.push(`/book/${result.data.id}`)
      } else {
        toast.error('No books available for randomization')
      }
    } catch (error) {
      console.error('Error getting random book:', error)
      toast.error('Failed to get random book recommendation')
    }
  }

  const defaultClassName = variant === 'default' 
    ? 'bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600' 
    : ''

  return (
    <Button
      onClick={handleRandomize}
      disabled={randomBookQuery.isFetching}
      variant={variant}
      className={`${defaultClassName} ${className}`}
      style={style}
    >
      <DiceFive className={`w-5 h-5 mr-2 ${randomBookQuery.isFetching ? 'animate-spin' : ''}`} />
      {randomBookQuery.isFetching ? 'Discovering...' : 'Randomize'}
    </Button>
  )
} 