'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { User, Book, Calendar } from 'lucide-react'
import { toast } from 'sonner'

interface Author {
  id: string
  penName: string
  bio: string | null
  stylePrompt?: string | null
  createdAt?: string
}

interface AuthorBook {
  id: string
  title: string
  genre: {
    label: string
  }
  pageCount: number
  language: string
  createdAt: string
  stats?: {
    likes: number
    views: number
  }
}

interface AuthorDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  author: Author | null
  currentBookId?: string // To exclude current book from the list
}

export function AuthorDialog({ isOpen, onOpenChange, author, currentBookId }: AuthorDialogProps) {
  const [books, setBooks] = useState<AuthorBook[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const BOOKS_PER_PAGE = 5

  // Fetch author's books
  const fetchAuthorBooks = async (reset = false) => {
    if (!author) return

    setLoading(true)
    const currentOffset = reset ? 0 : offset

    try {
      const params = new URLSearchParams({
        authorId: author.id,
        limit: BOOKS_PER_PAGE.toString(),
        offset: currentOffset.toString(),
        ...(currentBookId && { excludeBookId: currentBookId })
      })

      const response = await fetch(`/api/author/books?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch author books')
      }

      const data = await response.json()
      
      if (reset) {
        setBooks(data.books)
        setOffset(BOOKS_PER_PAGE)
      } else {
        setBooks(prev => [...prev, ...data.books])
        setOffset(prev => prev + BOOKS_PER_PAGE)
      }
      
      setHasMore(data.hasMore)
    } catch (error) {
      console.error('Error fetching author books:', error)
      toast.error('Failed to load author books')
    } finally {
      setLoading(false)
    }
  }

  // Reset and fetch books when dialog opens
  useEffect(() => {
    if (isOpen && author) {
      setBooks([])
      setOffset(0)
      setHasMore(false)
      fetchAuthorBooks(true)
    }
  }, [isOpen, author?.id])

  const handleBookClick = (bookId: string) => {
    // Navigate to the book
    window.location.href = `/book/${bookId}`
  }

  const handleLoadMore = () => {
    fetchAuthorBooks(false)
  }

  if (!author) return null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-white/95 backdrop-blur-md border border-mirage-border-primary shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-mirage-text-primary flex items-center gap-2">
            <User className="h-6 w-6" />
            {author.penName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 overflow-y-auto">
          {/* Author Info */}
          <div className="space-y-3">
            {author.bio && (
              <div>
                <h3 className="text-lg font-semibold text-mirage-text-primary mb-2">About the Author</h3>
                <p className="text-mirage-text-secondary leading-relaxed">
                  {author.bio}
                </p>
              </div>
            )}
            
            {author.createdAt && (
              <div className="flex items-center gap-2 text-sm text-mirage-text-muted">
                <Calendar className="h-4 w-4" />
                <span>Author since {new Date(author.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Books List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-mirage-text-primary flex items-center gap-2">
              <Book className="h-5 w-5" />
              Other Books by {author.penName}
            </h3>
            
            {loading && books.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'rgb(217 119 6)' }}></div>
              </div>
            ) : books.length === 0 ? (
              <div className="text-center py-8 text-mirage-text-muted">
                <Book className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No other books found by this author.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {books.map((book) => (
                  <Card 
                    key={book.id}
                    className="p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] bg-white/90 border-mirage-border-primary"
                    onClick={() => handleBookClick(book.id)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold text-mirage-text-primary hover:text-amber-600 transition-colors line-clamp-2">
                          {book.title}
                        </h4>
                        <span 
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ml-3 flex-shrink-0"
                          style={{ backgroundColor: 'rgb(217 119 6)' }}
                        >
                          {book.genre.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-mirage-text-muted">
                        <span>{book.pageCount} pages • {book.language}</span>
                        {book.stats && (
                          <div className="flex items-center gap-3">
                            <span>❤️ {book.stats.likes}</span>
                            <span>👁️ {book.stats.views}</span>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-mirage-text-light">
                        Published {new Date(book.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Card>
                ))}
                
                {/* Load More Button */}
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={handleLoadMore}
                      disabled={loading}
                      variant="outline"
                      className="border-mirage-border-primary"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 mr-2" style={{ borderColor: 'rgb(217 119 6)' }}></div>
                          Loading...
                        </>
                      ) : (
                        'Load More Books'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-mirage-border-primary">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="border-mirage-border-primary"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 