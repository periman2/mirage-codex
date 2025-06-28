'use client'

import { Suspense } from 'react'
import { BookGrid, BookSection } from '@/components/book-grid'
import { BrowseFilters } from '@/components/browse-filters'
import { RandomizeButton } from '@/components/randomize-button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { useUserSearchedBooks, useLatestBooks, useBooksByGenre } from '@/lib/queries'
import { useGenres } from '@/lib/queries'

export default function BrowsePage() {
  const { user } = useAuth()
  
  // Fetch data for different sections using infinite queries
  const userBooksQuery = useUserSearchedBooks(user?.id || '', 10)
  const latestBooksQuery = useLatestBooks(12)
  const { data: genres } = useGenres()
  
  // Get top genres to show sections for
  const topGenres = genres?.slice(0, 4) || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50">
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Header Section */}
        <section className="text-center space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h1 className="text-4xl font-bold text-amber-900 mb-2">
                Browse Library
              </h1>
              <p className="text-amber-700 text-lg">
                Discover books from the infinite collection
              </p>
            </div>
            <RandomizeButton variant="outline" />
          </div>
        </section>

        {/* User's Searched Books - Only show if user is logged in */}
        {user && (
          <Suspense fallback={<BookSectionSkeleton title="Your Recent Discoveries" />}>
            <BookSection 
              title="Your Recent Discoveries"
              queryResult={userBooksQuery}
            />
          </Suspense>
        )}

        {/* Latest Releases */}
        <Suspense fallback={<BookSectionSkeleton title="Latest Releases" />}>
          <BookSection 
            title="Latest Releases"
            queryResult={latestBooksQuery}
          />
        </Suspense>

        {/* Genre-Specific Sections */}
        {topGenres.map((genre) => (
          <GenreSection 
            key={genre.id} 
            genreSlug={genre.slug} 
            genreLabel={genre.label} 
          />
        ))}

        {/* Browse Filters for Advanced Search */}
        <section className="bg-white/60 backdrop-blur-sm rounded-2xl border border-amber-200/50 shadow-lg">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-amber-900 mb-4">
              Advanced Browse
            </h2>
            <p className="text-amber-700 mb-6">
              Use filters to find exactly what you're looking for
            </p>
            
            <Suspense fallback={<BrowseFilters />}>
              <BrowseFilters />
            </Suspense>

            <div className="mt-8">
              <Suspense fallback={<BookGridSkeleton />}>
                <BookGrid />
              </Suspense>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

// Genre-specific section component
function GenreSection({ genreSlug, genreLabel }: { genreSlug: string, genreLabel: string }) {
  const genreBooksQuery = useBooksByGenre(genreSlug, 10)
  
  return (
    <Suspense fallback={<BookSectionSkeleton title={genreLabel} />}>
      <BookSection 
        title={genreLabel}
        queryResult={genreBooksQuery}
      />
    </Suspense>
  )
}

// Loading skeleton for book sections
function BookSectionSkeleton({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-amber-900">{title}</h2>
      <div className="flex space-x-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-none w-48">
            <div className="aspect-square bg-amber-200/30 rounded-xl animate-pulse mb-3" />
            <div className="space-y-2">
              <div className="h-4 bg-amber-200/30 rounded animate-pulse" />
              <div className="h-3 bg-amber-200/30 rounded w-2/3 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Loading skeleton for the book grid
function BookGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <div className="aspect-square bg-amber-200/30 rounded-t-xl" />
          <CardContent className="p-4">
            <div className="h-4 bg-amber-200/30 rounded mb-2" />
            <div className="h-3 bg-amber-200/30 rounded mb-2" />
            <div className="h-3 bg-amber-200/30 rounded w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 