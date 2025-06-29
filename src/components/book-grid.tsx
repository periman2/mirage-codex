'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Book, User, Clock, ArrowLeft, ArrowRight } from 'iconoir-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { BookSearchResultCard } from './book-search-result-card'


// Types for books with all necessary data
type BookWithRelations = {
  id: string
  title: string
  summary: string
  page_count: number
  cover_url: string | null
  book_cover_prompt: string | null
  created_at: string | null
  authors: {
    id: string
    pen_name: string
    bio: string | null
  }
  languages: {
    id: number
    code: string
    label: string
  }
  genres: {
    id: string
    slug: string
    label: string
  }
  editions: Array<{
    id: string
    model_id: number
    language_id: number
    models: {
      id: number
      name: string
    }
  }>
}

// Transform database book to search result card format
const transformBookToSearchResult = (book: BookWithRelations) => {
  const defaultEdition = book.editions?.[0]
  
  return {
    id: book.id,
    title: book.title,
    summary: book.summary,
    pageCount: book.page_count,
    coverUrl: book.cover_url,
    bookCoverPrompt: book.book_cover_prompt,
    author: {
      id: book?.authors?.id,
      penName: book?.authors?.pen_name,
      bio: book?.authors?.bio
    },
    language: book.languages.label,
    sections: [], // We don't need sections for the browse cards
    edition: {
      id: defaultEdition?.id || '',
      modelId: defaultEdition?.model_id || 0,
      modelName: defaultEdition?.models?.name || 'Unknown'
    }
  }
}

// Horizontal scrollable book section for Netflix-style browsing with infinite loading
export function BookSection({ 
  title, 
  queryResult
}: { 
  title: string
  queryResult: any // Using any for now to fix typing issues
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const loadTriggerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = queryResult
  
  // Flatten all pages into a single array
  const allBooks = (data?.pages?.flat() || []) as any[]

  const checkScrollButtons = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10) // 10px buffer
    }
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8
      const newScrollLeft = scrollContainerRef.current.scrollLeft + 
        (direction === 'left' ? -scrollAmount : scrollAmount)
      
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      })
      
      // Update buttons after scroll
      setTimeout(checkScrollButtons, 300)
    }
  }

  // Intersection observer for infinite loading
  useEffect(() => {
    if (!loadTriggerRef.current || !hasNextPage || isFetchingNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage()
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '100px' // Load when 100px away from being visible
      }
    )

    observer.observe(loadTriggerRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Update scroll buttons when books change
  useEffect(() => {
    checkScrollButtons()
  }, [allBooks.length, checkScrollButtons])

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-7 bg-mirage-border-primary/30 rounded w-48 animate-pulse" />
        <div className="flex space-x-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-none w-48">
              <div className="aspect-square bg-mirage-border-primary/30 rounded-xl animate-pulse mb-3" />
              <div className="space-y-2">
                <div className="h-4 bg-mirage-border-primary/30 rounded animate-pulse" />
                <div className="h-3 bg-mirage-border-primary/30 rounded w-2/3 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (!allBooks.length) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-mirage-text-primary">{title}</h2>
        <div className="flex items-center justify-center h-32 text-mirage-text-tertiary text-sm">
          No books available in this section yet.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 group">
      {/* Section Title */}
      <h2 className="text-xl font-bold text-mirage-text-primary">{title}</h2>
      
      {/* Scrollable Books Container */}
      <div className="relative">
        {/* Left Shadow Gradient */}
        {canScrollLeft && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-12 z-20 pointer-events-none transition-opacity duration-300"
            style={{
              background: 'linear-gradient(to right, rgba(245, 245, 244, 0.8), transparent)'
            }}
          />
        )}

        {/* Right Shadow Gradient */}
        {canScrollRight && (
          <div 
            className="absolute right-0 top-0 bottom-0 w-12 z-20 pointer-events-none transition-opacity duration-300"
            style={{
              background: 'linear-gradient(to left, rgba(245, 245, 244, 0.8), transparent)'
            }}
          />
        )}

        {/* Left Scroll Button */}
        {canScrollLeft && (
          <Button
            variant="outline"
            size="sm"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 h-12 w-12 p-0 bg-white/95 backdrop-blur-sm border-mirage-border-primary/50 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            onClick={() => scroll('left')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        {/* Right Scroll Button */}
        {canScrollRight && (
          <Button
            variant="outline"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 h-12 w-12 p-0 bg-white/95 backdrop-blur-sm border-mirage-border-primary/50 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            onClick={() => scroll('right')}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        )}

        {/* Books Scroll Container */}
        <div
          ref={scrollContainerRef}
          className="flex space-x-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onScroll={checkScrollButtons}
        >
          {allBooks.map((book: any, index: number) => (
            <div key={`${book.id}-${index}`} className="flex-none w-48">
              <BookSearchResultCard book={book} />
            </div>
          ))}
          
          {/* Infinite loading trigger */}
          {hasNextPage && (
            <div ref={loadTriggerRef} className="flex-none w-48 flex items-center justify-center">
              {isFetchingNextPage ? (
                <div className="aspect-square bg-mirage-border-primary/30 rounded-xl animate-pulse flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgb(217 119 6)' }} />
                </div>
              ) : (
                <div className="aspect-square border-2 border-dashed rounded-xl flex items-center justify-center opacity-50" style={{ borderColor: 'rgb(217 119 6)' }}>
                  <Book className="h-8 w-8" style={{ color: 'rgb(217 119 6)' }} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Traditional grid for full browsing (keeping existing functionality but removing mocks)
export function BookGrid({ books, loading = false }: { books?: BookWithRelations[], loading?: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="aspect-square bg-mirage-border-primary/30 rounded-t-xl" />
            <CardContent className="p-4">
              <div className="h-4 bg-mirage-border-primary/30 rounded mb-2" />
              <div className="h-3 bg-mirage-border-primary/30 rounded mb-2" />
              <div className="h-3 bg-mirage-border-primary/30 rounded w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!books?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-mirage-text-tertiary">
        <Book className="h-16 w-16 mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No books found</h3>
        <p className="text-sm text-center max-w-md">
          Try adjusting your filters or search terms to discover more books.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {books.map((book) => (
        <BookSearchResultCard 
          key={book.id} 
          book={transformBookToSearchResult(book)} 
        />
      ))}
    </div>
  )
} 