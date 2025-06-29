'use client'

import { useGenres } from '@/lib/queries'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Book } from 'iconoir-react'
import Link from 'next/link'

export default function AllGenresPage() {
  const { data: genres, isLoading } = useGenres()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mirage-gradient">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'rgb(217 119 6)' }} />
            <p className="text-mirage-text-tertiary">Loading genres...</p>
          </div>
        </div>
      </div>
    )
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
              All Genres
            </h1>
            <p className="text-mirage-text-tertiary text-lg">
              Explore books by genre across the infinite collection
            </p>
          </div>
        </section>

        {/* Genres Grid Section */}
        <Card className="bg-white/95 backdrop-blur-md border border-mirage-border-primary shadow-xl rounded-xl">
          <CardContent className="p-6">
            {!genres || genres.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-mirage-text-tertiary">
                <Book className="h-16 w-16 mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No genres available</h3>
                <p className="text-sm text-center max-w-md">
                  Check back later for genre categories in the collection.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-mirage-text-primary">
                    {genres.length} {genres.length === 1 ? 'Genre' : 'Genres'} Available
                  </h2>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
                  {genres.map((genre) => (
                    <Link 
                      key={genre.id}
                      href={`/browse/genre/${genre.slug}`}
                      className="group"
                    >
                      <div className="bg-white/90 backdrop-blur-md border border-mirage-border-primary rounded-xl p-6 text-center hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer group-hover:bg-white">
                        <div 
                          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-xl font-bold shadow-md"
                          style={{ backgroundColor: 'rgb(217 119 6)' }}
                        >
                          {genre.label.charAt(0)}
                        </div>
                        <h3 className="text-sm font-medium text-mirage-text-primary group-hover:text-mirage-text-secondary transition-colors duration-200 mb-2">
                          {genre.label}
                        </h3>
                        <p className="text-xs text-mirage-text-muted">
                          Browse {genre.label.toLowerCase()} books
                        </p>
                        
                        {/* Hover indicator */}
                        <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div 
                            className="w-6 h-0.5 mx-auto rounded-full"
                            style={{ backgroundColor: 'rgb(217 119 6)' }}
                          />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Additional info */}
                <div className="text-center pt-6 border-t border-mirage-border-primary/30">
                  <p className="text-sm text-mirage-text-tertiary">
                    Click on any genre to explore its collection of books
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 