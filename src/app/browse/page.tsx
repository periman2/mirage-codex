'use client'

import { Suspense } from 'react'
import { BookSection } from '@/components/book-grid'
import { RandomizeButton } from '@/components/randomize-button'
import { useAuth } from '@/lib/auth-context'
import { useUserSearchedBooks, useUserLikedBooks, useLatestBooks, useBooksByGenre } from '@/lib/queries'
import { useGenres } from '@/lib/queries'
import Link from 'next/link'
import { ArrowRight } from 'iconoir-react'

export default function BrowsePage() {
  const { user } = useAuth()
  
  // Fetch data for different sections using infinite queries
  const userBooksQuery = useUserSearchedBooks(user?.id || '', 10)
  const userLikedBooksQuery = useUserLikedBooks(user?.id || '', 10)
  const latestBooksQuery = useLatestBooks(12)
  const { data: genres } = useGenres()
  
  // Get top genres to show sections for
  const topGenres = genres?.slice(0, 4) || []

  return (
    <div className="min-h-screen bg-mirage-gradient">
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Header Section */}
        <section className="text-center space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h1 className="text-4xl font-bold text-mirage-text-primary mb-2">
                Browse The Codex
              </h1>
              <p className="text-mirage-text-tertiary text-lg">
                Discover books from the infinite collection
              </p>
            </div>
            <div className="flex items-center">
              <RandomizeButton 
                variant="default"
                className="h-12 px-6 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                style={{
                  backgroundColor: 'rgb(217 119 6)',
                  borderColor: 'rgb(217 119 6)',
                  color: 'white'
                }}
              />
            </div>
          </div>
        </section>

        {/* User's Searched Books - Only show if user is logged in */}
        {user && (
          <Suspense fallback={<BookSectionSkeleton title="Your Recent Discoveries" />}>
            <ClickableBookSection 
              title="Your Recent Discoveries"
              queryResult={userBooksQuery}
              href="/browse/recent"
            />
          </Suspense>
        )}

        {/* User's Liked Books - Only show if user is logged in */}
        {user && (
          <Suspense fallback={<BookSectionSkeleton title="Recently Liked Books" />}>
            <ClickableBookSection 
              title="Recently Liked Books"
              queryResult={userLikedBooksQuery}
              href="/browse/liked"
            />
          </Suspense>
        )}

        {/* Latest Releases */}
        <Suspense fallback={<BookSectionSkeleton title="Latest Releases" />}>
          <ClickableBookSection 
            title="Latest Releases"
            queryResult={latestBooksQuery}
            href="/browse/latest"
          />
        </Suspense>

        {/* Genre-Specific Sections */}
        {topGenres.map((genre) => (
          <GenreSection 
            key={genre.id} 
            genreId={genre.id}
            genreSlug={genre.slug} 
            genreLabel={genre.label} 
          />
        ))}

        {/* All Genres Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-mirage-text-primary">
              Browse by Genre
            </h2>
            <Link 
              href="/browse/genres"
              className="flex items-center text-sm font-medium transition-colors duration-200 hover:opacity-80"
              style={{ color: 'rgb(217 119 6)' }}
            >
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {genres?.map((genre) => (
              <Link 
                key={genre.id}
                href={`/browse/genre/${genre.slug}`}
                className="group"
              >
                <div className="bg-white/90 backdrop-blur-md border border-mirage-border-primary rounded-xl p-4 text-center hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer">
                  <div 
                    className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-lg font-bold"
                    style={{ backgroundColor: 'rgb(217 119 6)' }}
                  >
                    {genre.label.charAt(0)}
                  </div>
                  <h3 className="text-sm font-medium text-mirage-text-primary group-hover:text-mirage-text-secondary transition-colors duration-200">
                    {genre.label}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

// Clickable Book Section component with routing
function ClickableBookSection({ 
  title, 
  queryResult, 
  href 
}: { 
  title: string
  queryResult: any
  href: string 
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-mirage-text-primary">{title}</h2>
        <Link 
          href={href}
          className="flex items-center text-sm font-medium transition-colors duration-200 hover:opacity-80"
          style={{ color: 'rgb(217 119 6)' }}
        >
          View All
          <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </div>
             <BookSection 
         title=""
         queryResult={queryResult}
       />
    </div>
  )
}

// Genre-specific section component
function GenreSection({ 
  genreId, 
  genreSlug, 
  genreLabel 
}: { 
  genreId: string
  genreSlug: string
  genreLabel: string 
}) {
  const genreBooksQuery = useBooksByGenre(genreSlug, 10)
  
  return (
    <Suspense fallback={<BookSectionSkeleton title={genreLabel} />}>
      <ClickableBookSection 
        title={genreLabel}
        queryResult={genreBooksQuery}
        href={`/browse/genre/${genreSlug}`}
      />
    </Suspense>
  )
}

// Loading skeleton for book sections
function BookSectionSkeleton({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-mirage-text-primary">{title}</h2>
        <div className="h-5 w-16 bg-mirage-border-primary/30 rounded animate-pulse" />
      </div>
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