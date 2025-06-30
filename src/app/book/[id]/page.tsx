'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Bookmark, Share2, Eye, Heart, Type } from 'lucide-react'
import { toast } from 'sonner'
import Markdown from 'react-markdown'
import { useBookStats, useBookLike, useBookView, usePageStats, usePageLike, usePageView, usePageContent } from '@/hooks/useBookStats'
import { useBookData, type BookData, type BookEdition } from '@/hooks/useBookData'
import { useBookmarks } from '@/hooks/useBookmarks'
import { BookInfoSidebar } from '@/components/book-info-sidebar'
import { BookmarkDialogs } from '@/components/bookmark-dialogs'

export default function BookDetailPage() {
  
  const { user } = useAuth()
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const bookId = params?.id as string
  const editionId = searchParams?.get('edition') // Get edition from URL params

  // Use the new hook for book data
  const { data: book, isLoading: loading, error: bookError } = useBookData(bookId)

  // Determine current edition from URL params or default to first edition
  const currentEdition = book?.editions.find(ed => ed.id === editionId) || book?.editions[0]

  const [currentPage, setCurrentPage] = useState(() => {
    const pageParam = searchParams?.get('page')
    return pageParam ? parseInt(pageParam) : 1
  })
  const [pageContent, setPageContent] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPageCached, setIsPageCached] = useState(false) // Track if page content is cached/saved
  const [isMobileBookInfoOpen, setIsMobileBookInfoOpen] = useState(false)
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large' | 'xl'>('medium')


  // Optimistic UI state
  const [optimisticBookLike, setOptimisticBookLike] = useState<{ liked: boolean; count: number } | null>(null)
  const [optimisticPageLike, setOptimisticPageLike] = useState<{ liked: boolean; count: number } | null>(null)

  // Ref to prevent duplicate generation requests
  const generationInProgress = useRef(false)

  // Font size utility function
  const getFontSizeClasses = (size: typeof fontSize) => {
    switch (size) {
      case 'small':
        return 'text-sm leading-relaxed'
      case 'medium':
        return 'text-base leading-relaxed'
      case 'large':
        return 'text-lg leading-relaxed'
      case 'xl':
        return 'text-xl leading-relaxed'
      default:
        return 'text-base leading-relaxed'
    }
  }

  // Function to replace image prompts with markdown image syntax
  const processImagePrompts = (content: string): string => {
    if (!currentEdition?.id || !bookId || !currentPage) return content

    const promptPattern = /\[p=([^\]]+)\]/g

    // Replace [p=prompt] with markdown image pointing to our API route
    const processedContent = content.replace(promptPattern, (match, prompt) => {
      const trimmedPrompt = prompt.trim()
      const imageUrl = `/api/book/${bookId}/page/${currentPage}/image?prompt=${encodeURIComponent(trimmedPrompt)}&edition=${currentEdition.id}`
      
      console.log(`🖼️ Replacing "${match}" with image URL: ${imageUrl}`);
      
      // Simple markdown image syntax - let the browser handle loading
      return `\n\n![Scene: ${trimmedPrompt}](${imageUrl})\n*${trimmedPrompt}*\n\n`
    })
    
    return processedContent
  }



  // Book-level stats hooks (only enabled when page content is cached/saved)
  const { data: bookStats, refetch: refetchBookStats } = useBookStats(bookId, isPageCached)
  const bookLikeMutation = useBookLike(bookId)
  const { trackView: trackBookView } = useBookView(bookId)

  // useChat hook for proper streaming
  const { messages, append, status: chatStatus } = useChat({
    api: `/api/book/${bookId}/page/${currentPage}`,
    body: {
      editionId: currentEdition?.id
    },
    onFinish: async (message) => {
      // Save the content to database (keeping [p=...] patterns for image processing)
      if (message.content && currentEdition?.id) {
        try {
          // Save the raw content (with [p=...] patterns) to database
          await fetch(`/api/book/${bookId}/page/${currentPage}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              editionId: currentEdition.id,
              content: message.content // Keep the raw content with patterns
            })
          })
          setPageContent(message.content) // Store raw content with patterns
          setIsPageCached(true) // Mark as cached since we successfully saved to database
          console.log('✅ Page content saved to database')
        } catch (error) {
          console.error('❌ Failed to save page content:', error)
          toast.error('Failed to save page content')
          setIsPageCached(false) // Keep as false if save failed
        }
      }
      setIsGenerating(false)
      generationInProgress.current = false
    },
    onError: (error) => {
      console.error('❌ Page generation error:', error)
      toast.error('Failed to generate page content')
      setIsGenerating(false)
      generationInProgress.current = false
    }
  })

  // Page content loading query (don't load if we already have cached content)
  const shouldLoadPageContent = !!currentEdition?.id && !!currentPage && !isGenerating && chatStatus !== 'streaming' && !generationInProgress.current && !isPageCached

  const {
    isLoading: isPageContentLoading
  } = usePageContent(
    bookId,
    currentPage,
    currentEdition?.id,
    shouldLoadPageContent,
    // onSuccess callback
    (data) => {
      console.log('📄 Page content loaded:', data);
      if (data.exists && data.content) {
        
        // Store the RAW content (with [p=...] patterns) so processImagePrompts can find them
        setPageContent(data.content);
        setIsPageCached(true);
        console.log('✅ Page content set from cache (keeping original [p=...] patterns)');

        // Track page view when content is loaded from cache
        if (currentEdition?.id) {
          trackPageView(currentEdition.id);
        }
      } else if (!data.exists && !isGenerating && !generationInProgress.current) {
        // Content doesn't exist, trigger generation if user is authenticated
        if (user) {
          console.log('🔄 Page content missing, starting generation');
          startGeneration();
        }
      }
    },
    // onError callback
    (error) => {
      console.error('❌ Page content loading error:', error);
      toast.error('Failed to load page content');
      setPageContent('');
      setIsPageCached(false);
    }
  )

  // Page-level stats hooks (only fetch if page content is cached/saved)
  const shouldFetchPageStats = isPageCached && !isGenerating && chatStatus !== 'streaming'
  const { data: pageStats } = usePageStats(
    bookId,
    currentPage,
    currentEdition?.id,
    shouldFetchPageStats
  )
  const pageLikeMutation = usePageLike(bookId, currentPage)
  const { trackView: trackPageView } = usePageView(bookId, currentPage)

  // Bookmarks hook - handles all bookmark-related logic
  const bookmarks = useBookmarks({
    user,
    currentEdition,
    currentPage,
    isPageCached,
    onPageChange: setCurrentPage
  })

  // Function to update URL with current page and edition
  const updatePageURL = (pageNumber: number, newEditionId?: string) => {
    const params = new URLSearchParams()
    const editionToUse = newEditionId || currentEdition?.id
    if (editionToUse) {
      params.set('edition', editionToUse)
    }
    if (pageNumber > 1) {
      params.set('page', pageNumber.toString())
    }

    const newURL = `/book/${bookId}${params.toString() ? '?' + params.toString() : ''}`
    router.push(newURL, { scroll: false })
  }

  // Function to handle edition switching
  const handleEditionChange = (newEditionId: string) => {
    // Reset page content when switching editions
    setPageContent('')
    setIsPageCached(false)

    // Update URL with new edition
    updatePageURL(currentPage, newEditionId)

    toast.success('Switched to different edition')
  }

  // Function to start generation using useChat
  const startGeneration = async () => {
    if (!book || generationInProgress.current) return

    // Check if user is authenticated
    if (!user) {
      toast.error('Please sign in to generate new pages')
      return
    }

    generationInProgress.current = true
    setIsGenerating(true)

    try {
      await append({
        role: 'user',
        content: `Generate page ${currentPage} of "${book.title}"`
      })
    } catch (error) {
      console.error('Generation failed:', error)
      setIsGenerating(false)
      generationInProgress.current = false
    }
  }

  // Update URL when book loads or page changes
  useEffect(() => {
    if (book && currentPage) {
      updatePageURL(currentPage)
    }
  }, [currentEdition?.id, currentPage])

  // Track book view when page content is cached (book successfully loaded)
  useEffect(() => {
    if (book && isPageCached) {
      trackBookView()
    }
  }, [book?.id, isPageCached])

  // Reset page state when changing pages
  useEffect(() => {
    setPageContent('')
    setIsPageCached(false)
  }, [currentPage, currentEdition?.id])

  // Memoize the processed content to avoid unnecessary re-processing  
  const processedPageContent = useMemo(() => {
    if (!pageContent) return ''
    
    console.log('🧠 Memoizing page content processing...');
    return processImagePrompts(pageContent)
  }, [pageContent, currentEdition?.id, bookId, currentPage])

  const nextPage = () => {
    if (book && currentPage < book.pageCount) {
      const newPage = currentPage + 1
      setCurrentPage(newPage)
      // URL will be updated automatically by useEffect
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1
      setCurrentPage(newPage)
      // URL will be updated automatically by useEffect
    }
  }



  const handleShare = async () => {
    // Use current URL which already has the page and edition cached
    const url = window.location.href
    await navigator.clipboard.writeText(url)
    toast.success('Page link copied to clipboard!')
  }

  // Handle book like/unlike with optimistic updates
  const handleBookLike = async () => {
    if (!user) {
      toast.error('Please sign in to like books')
      return
    }

    // Only set optimistic state if not already set (prevent double-setting)
    if (optimisticBookLike === null) {
      const currentLiked = bookStats?.userLiked ?? false
      const currentCount = bookStats?.likes ?? book?.stats?.likes ?? 0
      const newLiked = !currentLiked
      const newCount = newLiked ? currentCount + 1 : Math.max(0, currentCount - 1)

      setOptimisticBookLike({ liked: newLiked, count: newCount })
    }

    try {
      await bookLikeMutation.mutateAsync()
      // Clear optimistic state immediately when mutation succeeds
      // The mutation's onSuccess will handle refetching
      setOptimisticBookLike(null)
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticBookLike(null)
      console.error('Failed to toggle book like:', error)
      toast.error('Failed to update like')
    }
  }

  // Handle page like/unlike with optimistic updates
  const handlePageLike = async () => {
    if (!user) {
      toast.error('Please sign in to like pages')
      return
    }

    if (!currentEdition?.id) {
      toast.error('Edition ID not available')
      return
    }

    // Only set optimistic state if not already set (prevent double-setting)
    if (optimisticPageLike === null) {
      const currentLiked = pageStats?.userLiked ?? false
      const currentCount = pageStats?.likes ?? 0
      const newLiked = !currentLiked
      const newCount = newLiked ? currentCount + 1 : Math.max(0, currentCount - 1)

      setOptimisticPageLike({ liked: newLiked, count: newCount })
    }

    try {
      await pageLikeMutation.mutateAsync(currentEdition.id)
      // Clear optimistic state immediately when mutation succeeds
      // The mutation's onSuccess will handle refetching
      setOptimisticPageLike(null)
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticPageLike(null)
      console.error('Failed to toggle page like:', error)
      toast.error('Failed to update like')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-mirage-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-mirage-accent-primary mx-auto"></div>
          <p className="mt-4 text-mirage-text-secondary">Loading book...</p>
        </div>
      </div>
    )
  }

  if (bookError) {
    return (
      <div className="min-h-screen bg-mirage-gradient flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-mirage-text-primary mb-4">Error Loading Book</h1>
          <p className="text-mirage-text-tertiary">{bookError.message}</p>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-mirage-gradient flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-mirage-text-primary mb-4">Book Not Found</h1>
          <p className="text-mirage-text-tertiary">The requested book could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-mirage-gradient relative">
      <div className="flex h-full">
        {/* Left Sidebar - Book Information */}
        <BookInfoSidebar
          book={book}
          currentEdition={currentEdition}
          currentPage={currentPage}
          isOpen={isMobileBookInfoOpen}
          onClose={() => setIsMobileBookInfoOpen(false)}
          onOpen={() => setIsMobileBookInfoOpen(true)}
          onEditionChange={handleEditionChange}
          user={user}
          bookStats={bookStats}
          optimisticBookLike={optimisticBookLike}
          onBookLike={handleBookLike}
          isBookLikePending={bookLikeMutation.isPending}
          allBookmarks={bookmarks.allBookmarks}
          onOpenBookmarksList={bookmarks.handleOpenBookmarksList}
        />

        {/* Main Content - Page Content */}
        <div className="flex-1 p-4 md:p-4 pt-16 md:pt-4 flex flex-col">
          <Card className="flex-1 bg-white/95 backdrop-blur-md border border-mirage-border-primary shadow-xl rounded-xl overflow-hidden">
            <div className="h-full flex flex-col">
              {/* Page Header */}
              <div className="px-4 py-3 md:px-6 md:py-4 border-b border-mirage-border-primary bg-white/90 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">

                    {/* Page stats and actions */}
                    <div className="flex items-center gap-3">
                      {/* Page Like Button */}
                      {user ? (
                        <button
                          onClick={handlePageLike}
                          disabled={pageLikeMutation.isPending}
                          className="flex items-center space-x-1 hover:text-red-500 transition-colors text-sm text-mirage-text-muted cursor-pointer"
                          title={`${optimisticPageLike?.liked ?? pageStats?.userLiked ? 'Unlike' : 'Like'} this page`}
                        >
                          <Heart className={`h-4 w-4 ${optimisticPageLike?.liked ?? pageStats?.userLiked ? 'fill-red-500 text-red-500' : ''}`} />
                          <span>{optimisticPageLike?.count ?? pageStats?.likes ?? 0}</span>
                        </button>
                      ) : (
                        <div className="flex items-center space-x-1 text-sm text-mirage-text-muted">
                          <Heart className="h-4 w-4" />
                          <span>{pageStats?.likes ?? 0}</span>
                        </div>
                      )}

                      {/* Page Views */}
                      <div className="flex items-center space-x-1 text-sm text-mirage-text-muted">
                        <Eye className="h-4 w-4" />
                        <span>{pageStats?.views ?? 0}</span>
                      </div>

                      {/* Bookmark Button */}
                      {user ? (
                        <button
                          onClick={bookmarks.handleBookmark}
                          className="hover:scale-110 transition-transform cursor-pointer"
                          title={bookmarks.existingBookmark ? (bookmarks.existingBookmark.note ? `Bookmarked: ${bookmarks.existingBookmark.note}` : 'Remove bookmark') : 'Add bookmark'}
                        >
                          {bookmarks.existingBookmark ? (
                            <Bookmark className="h-4 w-4 fill-current" style={{ color: 'rgb(217 119 6)' }} />
                          ) : (
                            <Bookmark className="h-4 w-4 text-mirage-text-muted hover:text-amber-600 transition-colors" />
                          )}
                        </button>
                      ) : (
                        <Bookmark className="h-4 w-4 text-mirage-text-muted opacity-50" />
                      )}

                      {/* Share Button */}
                      <button
                        onClick={handleShare}
                        className="hover:scale-110 transition-transform cursor-pointer"
                        title="Share this page"
                      >
                        <Share2 className="h-4 w-4 text-mirage-text-muted hover:text-amber-600 transition-colors" />
                      </button>

                      {/* Font Size Selector */}
                      <div className="flex items-center space-x-1">
                        <Type className="h-4 w-4 text-mirage-text-muted" />
                        <Select value={fontSize} onValueChange={(value: typeof fontSize) => setFontSize(value)}>
                          <SelectTrigger className="h-8 w-20 text-xs border-mirage-border-primary bg-white/90">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small" className="text-xs">Small</SelectItem>
                            <SelectItem value="medium" className="text-sm">Medium</SelectItem>
                            <SelectItem value="large" className="text-base">Large</SelectItem>
                            <SelectItem value="xl" className="text-lg">Extra Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Page Content - Scrollable */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 md:p-6">
                  {isPageContentLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto" style={{ borderColor: 'rgb(217 119 6)' }}></div>
                        <p className="mt-4 text-mirage-text-secondary">Loading page content...</p>
                      </div>
                    </div>
                  ) : isGenerating ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-mirage-text-tertiary mb-4">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: 'rgb(217 119 6)' }}></div>
                        <span className="text-sm">Generating page content...</span>
                      </div>

                      {/* Show streaming content with markdown */}
                      <div className="prose prose-amber max-w-none">
                        <Markdown
                          components={{
                            h1: ({ children }) => <h1 className="text-2xl font-bold text-mirage-text-primary mb-4">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xl font-semibold text-mirage-text-primary mb-3">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-lg font-medium text-mirage-text-primary mb-2">{children}</h3>,
                            p: ({ children }) => <p className={`text-mirage-text-primary mb-4 ${getFontSizeClasses(fontSize)}`}>{children}</p>,
                            em: ({ children }) => <em className="text-mirage-text-secondary italic">{children}</em>,
                            strong: ({ children }) => <strong className="text-mirage-text-primary font-semibold">{children}</strong>,
                            ul: ({ children }) => <ul className={`list-disc list-inside mb-4 text-mirage-text-primary space-y-1 ${getFontSizeClasses(fontSize)}`}>{children}</ul>,
                            ol: ({ children }) => <ol className={`list-decimal list-inside mb-4 text-mirage-text-primary space-y-1 ${getFontSizeClasses(fontSize)}`}>{children}</ol>,
                            blockquote: ({ children }) => <blockquote className={`border-l-4 border-mirage-border-primary pl-4 italic text-mirage-text-secondary mb-4 ${getFontSizeClasses(fontSize)}`}>{children}</blockquote>,
                            img: ({ src, alt, ...props }) => (
                              <img 
                                src={src} 
                                alt={alt}
                                className="w-full max-w-2xl mx-auto my-6 rounded-lg shadow-lg hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                                style={{ display: 'block' }}
                                {...props}
                              />
                            ),
                          }}
                        >
                          {(() => {
                            const streamingContent = messages[messages.length - 1]?.content || ''
                            return processImagePrompts(streamingContent)
                          })()}
                        </Markdown>
                      </div>
                    </div>
                  ) : pageContent ? (
                    <div className="prose prose-amber max-w-none">
                      <Markdown
                        components={{
                          h1: ({ children }) => <h1 className="text-2xl font-bold text-mirage-text-primary mb-4">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xl font-semibold text-mirage-text-primary mb-3">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-lg font-medium text-mirage-text-primary mb-2">{children}</h3>,
                          p: ({ children }) => <p className={`text-mirage-text-primary mb-4 ${getFontSizeClasses(fontSize)}`}>{children}</p>,
                          em: ({ children }) => <em className="text-mirage-text-secondary italic">{children}</em>,
                          strong: ({ children }) => <strong className="text-mirage-text-primary font-semibold">{children}</strong>,
                          ul: ({ children }) => <ul className={`list-disc list-inside mb-4 text-mirage-text-primary space-y-1 ${getFontSizeClasses(fontSize)}`}>{children}</ul>,
                          ol: ({ children }) => <ol className={`list-decimal list-inside mb-4 text-mirage-text-primary space-y-1 ${getFontSizeClasses(fontSize)}`}>{children}</ol>,
                          blockquote: ({ children }) => <blockquote className={`border-l-4 border-mirage-border-primary pl-4 italic text-mirage-text-secondary mb-4 ${getFontSizeClasses(fontSize)}`}>{children}</blockquote>,
                          img: ({ src, alt, ...props }) => (
                            <img 
                              src={src} 
                              alt={alt}
                              className="w-full max-w-2xl mx-auto my-6 rounded-lg shadow-lg hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                              style={{ display: 'block' }}
                              {...props}
                            />
                          ),
                        }}
                      >
                          {processedPageContent}
                        </Markdown>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center space-y-4">
                        {!user ? (
                          <>
                            <p className="text-mirage-text-muted">This page hasn't been generated yet.</p>
                            <p className="text-mirage-text-light text-sm">Please sign in to generate new pages.</p>
                            <Button
                              onClick={() => window.location.href = '/'}
                              className=""
                              style={{
                                backgroundColor: 'rgb(217 119 6)',
                                borderColor: 'rgb(217 119 6)',
                                color: 'white'
                              }}
                            >
                              Sign In
                            </Button>
                          </>
                        ) : (
                          <p className="text-mirage-text-muted">No content available for this page.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Page Counter and Navigation - Fixed at Bottom */}
              <div className="px-4 py-3 md:px-6 md:py-4 border-t border-mirage-border-primary bg-white/90 flex-shrink-0">
                <div className="flex items-center justify-between">
                  {/* Page Counter */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-mirage-text-secondary font-medium">
                      Page {currentPage} of {book?.pageCount || '?'}
                    </span>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex space-x-2 md:space-x-3">
                    <Button
                      onClick={prevPage}
                      disabled={currentPage <= 1}
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 md:h-10 md:px-4 text-xs md:text-sm bg-white/90 border-mirage-border-primary"
                    >
                      <ChevronLeft className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                      <span className="hidden sm:inline">Previous</span>
                      <span className="sm:hidden">Prev</span>
                    </Button>
                    <Button
                      onClick={nextPage}
                      disabled={!book || currentPage >= book.pageCount}
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 md:h-10 md:px-4 text-xs md:text-sm bg-white/90 border-mirage-border-primary"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <span className="sm:hidden">Next</span>
                      <ChevronRight className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bookmark Dialogs */}
      <BookmarkDialogs
        isCreateOpen={bookmarks.isBookmarkDialogOpen}
        onCreateOpenChange={bookmarks.setIsBookmarkDialogOpen}
        currentPage={currentPage}
        bookTitle={book?.title || ''}
        onCreateBookmark={bookmarks.createBookmark}
        isListOpen={bookmarks.isBookmarksListOpen}
        onListOpenChange={bookmarks.setIsBookmarksListOpen}
        allBookmarks={bookmarks.allBookmarks}
        bookmarksLoading={bookmarks.bookmarksLoading}
        currentPageNumber={currentPage}
        onJumpToBookmark={bookmarks.jumpToBookmark}
      />
    </div>
  )
} 