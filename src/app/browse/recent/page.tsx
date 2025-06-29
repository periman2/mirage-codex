'use client'

import { Suspense } from 'react'
import { BookSearchResultCard } from '@/components/book-search-result-card'
import { useUserSearchedBooks } from '@/lib/queries'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Book, User } from 'iconoir-react'
import Link from 'next/link'

export default function RecentDiscoveriesPage() {
  const { user } = useAuth()
  const userBooksQuery = useUserSearchedBooks(user?.id || '', 24)

  // Redirect to browse if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-mirage-gradient">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="bg-white/95 backdrop-blur-md border border-mirage-border-primary shadow-xl rounded-xl">
              <CardContent className="p-8">
                <User className="h-16 w-16 mx-auto mb-4 text-mirage-text-light" />
                <h1 className="text-2xl font-bold text-mirage-text-primary mb-4">
                  Authentication Required
                </h1>
                <p className="text-mirage-text-tertiary mb-6">
                  Please sign in to view your recent discoveries.
                </p>
                <div className="space-x-4">
                  <Link href="/browse">
                    <Button variant="outline" className="bg-white/90 border-mirage-border-primary">
                      Back to Browse
                    </Button>
                  </Link>
                  <Button
                    onClick={() => window.location.href = '/'}
                    style={{
                      backgroundColor: 'rgb(217 119 6)',
                      borderColor: 'rgb(217 119 6)',
                      color: 'white'
                    }}
                  >
                    Sign In
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = userBooksQuery
  
  // Flatten all pages into a single array
  const allBooks = (data?.pages?.flat() || [])

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }

  return (
    <div className="min-h-screen bg-mirage-gradient">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header Section */}
        <section className="space-y-4">
          <div className="flex items-center space-x-4">
            <Link href="/browse">
              <Button 
                variant="outline" 
                size="sm"
                className="h-9 px-3 bg-white/90 border-mirage-border-primary hover:bg-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Browse
              </Button>
            </Link>
          </div>
          
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-mirage-text-primary">
              Your Recent Discoveries
            </h1>
            <p className="text-mirage-text-tertiary text-lg">
              Books you've searched for and explored
            </p>
          </div>
        </section>

        {/* Books Grid Section */}
        <Card className="bg-white/95 backdrop-blur-md border border-mirage-border-primary shadow-xl rounded-xl">
          <CardContent className="p-6">
            {isLoading ? (
              <BookGridSkeleton />
            ) : allBooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-mirage-text-tertiary">
                <Book className="h-16 w-16 mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No discoveries yet</h3>
                <p className="text-sm text-center max-w-md">
                  Start searching for books to see your discovery history here.
                </p>
                <Link href="/search" className="mt-4">
                  <Button
                    style={{
                      backgroundColor: 'rgb(217 119 6)',
                      borderColor: 'rgb(217 119 6)',
                      color: 'white'
                    }}
                  >
                    Start Searching
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-mirage-text-primary">
                    {allBooks.length} {allBooks.length === 1 ? 'Discovery' : 'Discoveries'}
                  </h2>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
                  {allBooks.map((book: any, index: number) => (
                    <div key={`${book.id}-${index}`}>
                      <BookSearchResultCard book={transformBookToSearchResult(book)} />
                    </div>
                  ))}
                </div>

                {/* Load More Button */}
                {hasNextPage && (
                  <div className="flex justify-center pt-6">
                    <Button
                      onClick={handleLoadMore}
                      disabled={isFetchingNextPage}
                      className="h-10 px-6"
                      style={{
                        backgroundColor: 'rgb(217 119 6)',
                        borderColor: 'rgb(217 119 6)',
                        color: 'white'
                      }}
                    >
                      {isFetchingNextPage ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Loading More...
                        </>
                      ) : (
                        'Load More Discoveries'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Helper function to transform book data
const transformBookToSearchResult = (book: any) => {
  return {
    id: book.id,
    title: book.title,
    summary: book.summary,
    pageCount: book.page_count,
    coverUrl: book.cover_url,
    bookCoverPrompt: book.book_cover_prompt,
    author: {
      id: book.authors.id,
      penName: book.authors.pen_name,
      bio: book.authors.bio
    },
    language: book.languages.label,
    sections: [], // Not used in this context
    edition: {
      id: book.editions[0]?.id || '',
      modelId: book.editions[0]?.model_id || 0,
      modelName: book.editions[0]?.models?.name || ''
    }
  }
}

// Loading skeleton for the book grid
function BookGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
      {Array.from({ length: 21 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-square bg-mirage-border-primary/30 rounded-xl mb-3" />
          <div className="space-y-2">
            <div className="h-4 bg-mirage-border-primary/30 rounded" />
            <div className="h-3 bg-mirage-border-primary/30 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
} 