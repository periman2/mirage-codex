'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BookSection } from '@/components/book-grid'
import { useAuth } from '@/lib/auth-context'
import { useUserLikedBooks } from '@/lib/queries'

export default function LikedBooksPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
      return
    }
  }, [user, authLoading, router])
  
  const userLikedBooksQuery = useUserLikedBooks(user?.id || '', 20) // Show more books per page
  
  // Don't render anything if still loading or user not authenticated
  if (authLoading || !user) {
    return null
  }
  
  return (
    <div className="min-h-screen bg-mirage-gradient">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <section className="text-center space-y-6 mb-12">
          <div className="text-left">
            <h1 className="text-4xl font-bold text-mirage-text-primary mb-2">
              Your Liked Books
            </h1>
            <p className="text-mirage-text-tertiary text-lg">
              All the books you've liked, with your most recent likes first
            </p>
          </div>
        </section>

        {/* Liked Books Grid */}
        <Suspense fallback={<LikedBooksSkeleton />}>
          <BookSection 
            title=""
            queryResult={userLikedBooksQuery}
          />
        </Suspense>
      </div>
    </div>
  )
}

// Loading skeleton for liked books
function LikedBooksSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="aspect-square bg-mirage-border-primary/30 rounded-xl animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 bg-mirage-border-primary/30 rounded animate-pulse" />
            <div className="h-3 bg-mirage-border-primary/30 rounded w-2/3 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
} 