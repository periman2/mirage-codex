'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Book, Calendar, FileText, ArrowLeft, Bookmark as BookmarkIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface BookmarkWithBookInfo {
  id: number
  page_number: number
  note: string | null
  created_at: string | null
  edition_id: string
  book: {
    id: string
    title: string
    summary: string
    cover_url: string | null
    genre: {
      label: string
      slug: string
    }
  }
  edition: {
    language: {
      label: string
      code: string
    }
    model: {
      name: string
    }
  }
}

// Helper function to get public URL for book covers
const getBookCoverUrl = (coverPath: string | null): string | null => {
  if (!coverPath) return null
  
  const { data } = supabase.storage
    .from('book-covers')
    .getPublicUrl(coverPath)
    
  return data.publicUrl
}

const BOOKMARKS_PER_PAGE = 15

const fetchBookmarks = async ({ pageParam = 0, userId }: { pageParam?: number; userId: string }) => {
  const from = pageParam * BOOKMARKS_PER_PAGE
  const to = from + BOOKMARKS_PER_PAGE - 1

  const { data, error } = await supabase
    .from('bookmarks')
    .select(`
      id,
      page_number,
      note,
      created_at,
      edition_id,
      book:editions!inner(
        book:books!inner(
          id,
          title,
          summary,
          cover_url,
          genre:genres!inner(
            label,
            slug
          )
        ),
        language:languages!inner(
          label,
          code
        ),
        model:models!inner(
          name
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    throw new Error(`Failed to fetch bookmarks: ${error.message}`)
  }

  // Transform the nested data structure
  const transformedBookmarks: BookmarkWithBookInfo[] = (data || []).map(bookmark => ({
    id: bookmark.id,
    page_number: bookmark.page_number,
    note: bookmark.note,
    created_at: bookmark.created_at,
    edition_id: bookmark.edition_id,
    book: {
      id: bookmark.book.book.id,
      title: bookmark.book.book.title,
      summary: bookmark.book.book.summary,
      cover_url: bookmark.book.book.cover_url,
      genre: {
        label: bookmark.book.book.genre.label,
        slug: bookmark.book.book.genre.slug
      }
    },
    edition: {
      language: {
        label: bookmark.book.language.label,
        code: bookmark.book.language.code
      },
      model: {
        name: bookmark.book.model.name
      }
    }
  }))

  return {
    bookmarks: transformedBookmarks,
    nextPage: transformedBookmarks.length === BOOKMARKS_PER_PAGE ? pageParam + 1 : undefined,
    hasMore: transformedBookmarks.length === BOOKMARKS_PER_PAGE
  }
}

export default function BookmarksPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
      return
    }
  }, [user, authLoading, router])

  // Infinite query for bookmarks
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: ({ pageParam = 0 }) => fetchBookmarks({ pageParam: pageParam as number, userId: user!.id }),
    getNextPageParam: (lastPage: { bookmarks: BookmarkWithBookInfo[]; nextPage?: number; hasMore: boolean }) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!user?.id,
    retry: 2
  })

  // Flatten all pages into a single array
  const allBookmarks = data?.pages.flatMap((page: { bookmarks: BookmarkWithBookInfo[]; nextPage?: number; hasMore: boolean }) => page.bookmarks) ?? []

  // Infinite scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000 // Start loading 1000px before bottom
      ) {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleBookmarkClick = (bookmark: BookmarkWithBookInfo) => {
    const params = new URLSearchParams()
    params.set('edition', bookmark.edition_id)
    if (bookmark.page_number > 1) {
      params.set('page', bookmark.page_number.toString())
    }

    const url = `/book/${bookmark.book.id}?${params.toString()}`
    router.push(url)
  }

  const deleteBookmark = async (bookmarkId: number) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', bookmarkId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error deleting bookmark:', error)
        toast.error('Failed to delete bookmark')
        return
      }

      // Refetch to update the list
      refetch()
      toast.success('Bookmark removed')
    } catch (error) {
      console.error('Error deleting bookmark:', error)
      toast.error('Failed to delete bookmark')
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-mirage-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-mirage-accent-primary mx-auto"></div>
          <p className="mt-4 text-mirage-text-secondary">Loading bookmarks...</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-mirage-gradient flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-mirage-text-primary mb-4">Error</h1>
          <p className="text-mirage-text-tertiary mb-4">
            {error instanceof Error ? error.message : 'Failed to load bookmarks'}
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mirage-gradient">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              size="sm"
              className="text-mirage-text-secondary hover:text-mirage-text-primary"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-mirage-text-primary flex items-center gap-3">
                <BookmarkIcon className="h-8 w-8" style={{ color: 'rgb(217 119 6)' }} />
                My Bookmarks
              </h1>
              <p className="text-mirage-text-secondary mt-2">
                {allBookmarks.length === 0 
                  ? 'No bookmarks saved yet' 
                  : `${allBookmarks.length} bookmark${allBookmarks.length === 1 ? '' : 's'} saved`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Bookmarks List */}
        {allBookmarks.length === 0 ? (
          <Card className="p-12 text-center bg-white/95 backdrop-blur-md border border-mirage-border-primary">
            <BookmarkIcon className="h-16 w-16 mx-auto text-mirage-text-muted mb-4" />
            <h2 className="text-xl font-semibold text-mirage-text-primary mb-2">No bookmarks yet</h2>
            <p className="text-mirage-text-secondary mb-6">
              Start reading books and save your favorite pages to see them here.
            </p>
            <Button 
              onClick={() => router.push('/browse')}
              style={{
                backgroundColor: 'rgb(217 119 6)',
                borderColor: 'rgb(217 119 6)',
                color: 'white'
              }}
            >
              <Book className="h-4 w-4 mr-2" />
              Browse Books
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {allBookmarks.map((bookmark) => (
              <Card 
                key={bookmark.id}
                className="group bg-white/95 backdrop-blur-md border border-mirage-border-primary shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
                onClick={() => handleBookmarkClick(bookmark)}
              >
                <div className="flex py-0 px-4">
                  {/* Square Book Cover */}
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-amber-200 rounded-md flex-shrink-0 relative overflow-hidden mr-4">
                    {bookmark.book.cover_url ? (
                      <img
                        src={getBookCoverUrl(bookmark.book.cover_url) || ''}
                        alt={bookmark.book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Book className="h-8 w-8 text-amber-600/50" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 mr-4">
                        {/* Title and Page */}
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-mirage-text-primary line-clamp-1 group-hover:text-amber-700 transition-colors">
                            {bookmark.book.title}
                          </h3>
                          <Badge className="bg-white/90 text-amber-800 border-amber-200 flex-shrink-0">
                            Page {bookmark.page_number}
                          </Badge>
                        </div>

                        {/* Genre & Language */}
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {bookmark.book.genre.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {bookmark.edition.language.label}
                          </Badge>
                        </div>

                        {/* Note */}
                        {bookmark.note && (
                          <div className="bg-amber-50 border border-amber-200 rounded-md p-2 mb-2">
                            <div className="flex items-start gap-2">
                              <FileText className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-amber-800 italic line-clamp-2">
                                "{bookmark.note}"
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="text-xs text-mirage-text-muted">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {bookmark.created_at 
                                ? formatDistanceToNow(new Date(bookmark.created_at), { addSuffix: true })
                                : 'Unknown date'
                              }
                            </span>
                            <span className="text-gray-400">•</span>
                            <span>Model: {bookmark.edition.model.name}</span>
                          </div>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteBookmark(bookmark.id)
                        }}
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:bg-red-50"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {/* Loading indicator for infinite scroll */}
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mirage-accent-primary"></div>
                <span className="ml-3 text-mirage-text-secondary">Loading more bookmarks...</span>
              </div>
            )}

            {/* End of list indicator */}
            {!hasNextPage && allBookmarks.length > 0 && (
              <div className="text-center py-8">
                <p className="text-mirage-text-muted text-sm">You've reached the end of your bookmarks</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 