'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronLeft, ChevronRight, Bookmark, BookmarkMinus, Share2, Book, Eye, List } from 'lucide-react'
import { toast } from 'sonner'
import Markdown from 'react-markdown'

interface BookData {
  id: string
  title: string
  summary: string
  pageCount: number
  coverUrl: string | null
  author: {
    id: string
    penName: string
    bio: string | null
  }
  language: string
  sections: Array<{
    title: string
    fromPage: number
    toPage: number
    summary: string
  }>
  edition: {
    id: string
    modelId: number
    modelName: string
  }
}

export default function BookDetailPage() {
  const { user } = useAuth()
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const bookId = params?.id as string
  const editionId = searchParams?.get('edition') // Get edition from URL params

  const [book, setBook] = useState<BookData | null>(null)
  const [currentPage, setCurrentPage] = useState(() => {
    // Initialize from URL params if available
    const pageParam = searchParams?.get('page')
    return pageParam ? parseInt(pageParam) : 1
  })
  const [pageContent, setPageContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isMobileBookInfoOpen, setIsMobileBookInfoOpen] = useState(false)
  const [existingBookmark, setExistingBookmark] = useState<{ id: number, note: string | null } | null>(null)
  const [bookmarkNote, setBookmarkNote] = useState('')
  const [isBookmarkDialogOpen, setIsBookmarkDialogOpen] = useState(false)
  const [isBookmarksListOpen, setIsBookmarksListOpen] = useState(false)
  const [allBookmarks, setAllBookmarks] = useState<Array<{ id: number, page_number: number, note: string | null, created_at: string | null }>>([])
  const [bookmarksLoading, setBookmarksLoading] = useState(false)
  
  // Ref to prevent duplicate generation requests
  const generationInProgress = useRef(false)

  // useChat hook for proper streaming
  const { messages, append, status: chatStatus } = useChat({
    api: `/api/book/${bookId}/page/${currentPage}`,
    body: {
      editionId: book?.edition.id
    },
    onFinish: async (message) => {
      // Save the generated content to database
      if (message.content && book?.edition.id) {
        try {
          await fetch(`/api/book/${bookId}/page/${currentPage}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              editionId: book.edition.id,
              content: message.content
            })
          })
          setPageContent(message.content)
          console.log('✅ Page content saved to database')
        } catch (error) {
          console.error('❌ Failed to save page content:', error)
          toast.error('Failed to save page content')
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

  // Function to update URL with current page
  const updatePageURL = (pageNumber: number) => {
    const params = new URLSearchParams()
    if (book?.edition.id) {
      params.set('edition', book.edition.id)
    }
    if (pageNumber > 1) {
      params.set('page', pageNumber.toString())
    }

    const newURL = `/book/${bookId}${params.toString() ? '?' + params.toString() : ''}`
    router.push(newURL, { scroll: false })
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

  // Load book details
  useEffect(() => {
    if (!bookId) return

    const loadBook = async () => {
      try {
        const response = await fetch(`/api/book/${bookId}`)
        if (!response.ok) throw new Error('Failed to load book')

        const bookData = await response.json()
        setBook(bookData)

        // Use edition from URL params or default to book's edition
        const finalEditionId = editionId || bookData.edition.id
        if (finalEditionId !== bookData.edition.id) {
          // If we have a different edition ID, we should update book data
          // For now, we'll use the book's default edition
          console.log('Using book default edition:', bookData.edition.id)
        }

      } catch (error) {
        console.error('Failed to load book:', error)
        toast.error('Failed to load book details')
      } finally {
        setLoading(false)
      }
    }

    loadBook()
  }, [bookId, editionId])

  // Update URL when book loads or page changes
  useEffect(() => {
    if (book && currentPage) {
      updatePageURL(currentPage)
    }
  }, [book?.edition.id, currentPage])

  // Load existing bookmark when user, book, or page changes
  useEffect(() => {
    loadExistingBookmark()
  }, [user?.id, book?.edition.id, currentPage])

  // Load all bookmarks when user and book are available
  useEffect(() => {
    if (user && book) {
      loadAllBookmarks()
    }
  }, [user?.id, book?.edition.id])

  // Load page content
  useEffect(() => {
    if (!book?.edition?.id || !currentPage || isGenerating || chatStatus === 'streaming' || generationInProgress.current) return

    const loadPageContent = async () => {
      setPageLoading(true)
      setPageContent('')

      try {
        // Check if page already exists using GET endpoint
        const checkResponse = await fetch(
          `/api/book/${bookId}/page/${currentPage}?editionId=${book.edition.id}`
        )

        if (checkResponse.ok) {
          const result = await checkResponse.json()
          if (result.exists && result.content) {
            // Page already exists, display it
            setPageContent(result.content)
            setPageLoading(false)
            return
          }
        }

        // Page doesn't exist, need to generate it
        setPageLoading(false)

        // Check if user is authenticated before attempting generation
        if (!user) {
          setPageContent('')
          return
        }

        await startGeneration()

      } catch (error) {
        console.error('Failed to load page:', error)
        toast.error('Failed to load page content')
        setPageLoading(false)
      }
    }

    loadPageContent()
  }, [book?.edition?.id, currentPage, user?.id]) // More specific dependencies

  const nextPage = () => {
    if (book && currentPage < book.pageCount) {
      const newPage = currentPage + 1
      setCurrentPage(newPage)
      updatePageURL(newPage)
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1
      setCurrentPage(newPage)
      updatePageURL(newPage)
    }
  }

  // Load existing bookmark for current page
  const loadExistingBookmark = async () => {
    if (!user || !book) return

    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('id, note')
        .eq('user_id', user.id)
        .eq('edition_id', book.edition.id)
        .eq('page_number', currentPage)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error loading bookmark:', error)
        return
      }

      setExistingBookmark(data || null)
    } catch (error) {
      console.error('Error checking bookmark:', error)
    }
  }

  // Load all bookmarks for current edition
  const loadAllBookmarks = async () => {
    if (!user || !book) return

    setBookmarksLoading(true)
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('id, page_number, note, created_at')
        .eq('user_id', user.id)
        .eq('edition_id', book.edition.id)
        .order('page_number', { ascending: true })

      if (error) {
        console.error('Error loading bookmarks:', error)
        toast.error('Failed to load bookmarks')
        return
      }

      setAllBookmarks(data || [])
    } catch (error) {
      console.error('Error loading bookmarks:', error)
      toast.error('Failed to load bookmarks')
    } finally {
      setBookmarksLoading(false)
    }
  }

  // Jump to a bookmarked page
  const jumpToBookmark = (pageNumber: number) => {
    setCurrentPage(pageNumber)
    setIsBookmarksListOpen(false)
    toast.success(`Jumped to page ${pageNumber}`)
  }

  // Create a new bookmark
  const createBookmark = async () => {
    if (!user || !book) return

    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .insert({
          user_id: user.id,
          edition_id: book.edition.id,
          page_number: currentPage,
          note: bookmarkNote.trim() || null
        })
        .select('id, note')
        .single()

      if (error) {
        console.error('Error creating bookmark:', error)
        toast.error('Failed to save bookmark')
        return
      }

      setExistingBookmark(data)
      setBookmarkNote('')
      setIsBookmarkDialogOpen(false)
      toast.success('Bookmark saved!')

      // Refresh bookmarks list
      loadAllBookmarks()
    } catch (error) {
      console.error('Error creating bookmark:', error)
      toast.error('Failed to save bookmark')
    }
  }

  // Delete existing bookmark
  const deleteBookmark = async () => {
    if (!existingBookmark) return

    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', existingBookmark.id)

      if (error) {
        console.error('Error deleting bookmark:', error)
        toast.error('Failed to remove bookmark')
        return
      }

      setExistingBookmark(null)
      toast.success('Bookmark removed!')

      // Refresh bookmarks list
      loadAllBookmarks()
    } catch (error) {
      console.error('Error deleting bookmark:', error)
      toast.error('Failed to remove bookmark')
    }
  }

  const handleBookmark = async () => {
    if (!user) {
      toast.error('Please sign in to save bookmarks')
      return
    }

    if (existingBookmark) {
      await deleteBookmark()
    } else {
      setBookmarkNote('') // Reset note when opening dialog
      setIsBookmarkDialogOpen(true)
    }
  }

  const handleShare = async () => {
    // Use current URL which already has the page and edition cached
    const url = window.location.href
    await navigator.clipboard.writeText(url)
    toast.success('Page link copied to clipboard!')
  }

  const handleOpenBookmarksList = () => {
    if (!user) {
      toast.error('Please sign in to view bookmarks')
      return
    }

    setIsBookmarksListOpen(true)
    loadAllBookmarks()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-amber-800">Loading book...</p>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-amber-900 mb-4">Book Not Found</h1>
          <p className="text-amber-700">The requested book could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-gradient-to-br from-amber-50 via-white to-amber-50 relative">
      {/* Mobile Book Info Button */}
      <Button
        onClick={() => setIsMobileBookInfoOpen(true)}
        className="md:hidden fixed top-24 left-4 z-40 h-10 w-10 p-0 bg-amber-600 hover:bg-amber-700 rounded-full shadow-lg"
      >
        <Book className="h-5 w-5" />
      </Button>

      {/* Mobile Overlay */}
      {isMobileBookInfoOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsMobileBookInfoOpen(false)} />
      )}

      <div className="flex h-full">
        {/* Left Sidebar - Book Information */}
        <div className={`
          w-80 h-full bg-white/80 backdrop-blur-sm border-r border-amber-200 shadow-lg
          md:relative md:block md:translate-x-0
          ${isMobileBookInfoOpen
            ? 'fixed inset-y-0 left-0 z-50 translate-x-0 transition-transform duration-300 ease-out md:transition-none'
            : 'fixed inset-y-0 left-0 -translate-x-full transition-transform duration-300 ease-out md:transition-none md:translate-x-0'
          }
        `}>
          <div className="h-full overflow-y-auto">
            {/* Mobile Close Button */}
            <div className="md:hidden flex justify-between items-center p-4 border-b border-amber-200/30">
              <h2 className="text-lg font-semibold text-amber-900">
                Book Info
              </h2>
              <Button
                onClick={() => setIsMobileBookInfoOpen(false)}
                variant="ghost"
                className="h-8 w-8 p-0"
              >
                ×
              </Button>
            </div>

            <div className="space-y-6 p-6">
              {/* Book Cover */}
              <div className="aspect-square relative rounded-lg overflow-hidden shadow-lg">
                <img
                  src={`/api/book/${book.id}/cover`}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Book Details */}
              <div className="space-y-4">
                <h1 className="text-2xl font-bold text-amber-900 leading-tight">
                  {book.title}
                </h1>
                <p className="text-base text-amber-700 font-medium">
                  by {book.author.penName}
                </p>
                <p className="text-sm text-amber-600">
                  {book.pageCount} pages • {book.language}
                </p>
                <p className="text-sm text-amber-600">
                  Generated with {book.edition.modelName}
                </p>
              </div>

              {/* Book Summary */}
              <Dialog>
                <div className="bg-amber-50/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-amber-900">Summary</h3>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-amber-600 hover:text-amber-800"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                  </div>
                  <DialogTrigger asChild>
                    <div className="cursor-pointer">
                      <p className="text-sm text-amber-800/80 leading-relaxed overflow-hidden" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {book.summary}
                      </p>
                      <p className="text-xs text-amber-600/70 italic mt-2 hover:text-amber-800 transition-colors">
                        Click to read full summary...
                      </p>
                    </div>
                  </DialogTrigger>
                </div>
                <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-sm border border-amber-200/50">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-amber-900">
                      {book.title}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    <h4 className="text-lg font-semibold text-amber-800 mb-3">Summary</h4>
                    <p className="text-base text-amber-900 leading-relaxed">
                      {book.summary}
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Page Info */}
              <div className="text-center">
                <span className="text-base text-amber-700 font-medium">
                  Page {currentPage} of {book.pageCount}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Bookmark Button */}
                {user ? (
                  <Dialog open={isBookmarkDialogOpen} onOpenChange={setIsBookmarkDialogOpen}>
                    <Button
                      variant={existingBookmark ? "default" : "outline"}
                      size="default"
                      className={`w-full flex items-center gap-2 h-10 ${existingBookmark
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : ''
                        }`}
                      onClick={handleBookmark}
                      title={existingBookmark?.note ? `Note: ${existingBookmark.note}` : undefined}
                    >
                      {existingBookmark ? (
                        <>
                          <BookmarkMinus className="h-4 w-4" />
                          Remove Bookmark
                          {existingBookmark.note && (
                            <span className="text-xs bg-amber-200 text-amber-800 px-1 py-0.5 rounded ml-1">
                              📝
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <Bookmark className="h-4 w-4" />
                          Add Bookmark
                        </>
                      )}
                    </Button>

                    <DialogContent className="max-w-md bg-white/95 backdrop-blur-sm border border-amber-200/50">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-amber-900">
                          Add Bookmark
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <p className="text-sm text-amber-800 mb-3">
                            Bookmarking page {currentPage} of "{book?.title}"
                          </p>
                          <Label htmlFor="bookmark-note" className="text-sm font-medium text-amber-900">
                            Note (optional)
                          </Label>
                          <Input
                            id="bookmark-note"
                            value={bookmarkNote}
                            onChange={(e) => setBookmarkNote(e.target.value)}
                            placeholder="Add a note about this page..."
                            className="mt-1 bg-white/80 border-amber-200/50"
                            maxLength={500}
                          />
                          <p className="text-xs text-amber-600/70 mt-1">
                            {bookmarkNote.length}/500 characters
                          </p>
                        </div>
                        <div className="flex space-x-2 pt-2">
                          <Button
                            onClick={() => setIsBookmarkDialogOpen(false)}
                            variant="outline"
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={createBookmark}
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            Save Bookmark
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Button
                    variant="outline"
                    size="default"
                    className="w-full flex items-center gap-2 h-10 opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <Bookmark className="h-4 w-4" />
                    Sign in to Bookmark
                  </Button>
                )}


                {user ? (
                  <Button
                    variant="outline"
                    size="default"
                    className="w-full flex items-center gap-2 h-10"
                    onClick={handleOpenBookmarksList}
                  >
                    <List className="h-4 w-4" />
                    View Bookmarks ({allBookmarks.length})
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="default"
                    className="w-full flex items-center gap-2 h-10 opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <List className="h-4 w-4" />
                    Sign in for Bookmarks
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="default"
                  className="w-full flex items-center gap-2 h-10"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                  Share Page
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Page Content */}
        <div className="flex-1 p-4 md:p-4 pt-16 md:pt-4 flex flex-col">
          <Card className="flex-1 bg-white/95 backdrop-blur-sm border border-amber-200/50 shadow-lg rounded-xl overflow-hidden">
            <div className="h-full flex flex-col">
              {/* Page Header */}
              <div className="px-4 py-3 md:px-6 md:py-4 border-b border-amber-200/30 bg-white/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm md:text-lg font-semibold text-amber-900">
                      Page {currentPage} of {book?.pageCount}
                    </h2>
                    {existingBookmark && (
                      <span
                        className="text-amber-600 hover:text-amber-800 transition-colors"
                        title={existingBookmark.note ? `Bookmarked: ${existingBookmark.note}` : 'Bookmarked'}
                      >
                        <Bookmark className="h-4 w-4 fill-current" />
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2 md:space-x-3">
                    <Button
                      onClick={prevPage}
                      disabled={currentPage <= 1}
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 md:h-10 md:px-4 text-xs md:text-sm bg-white/80 border-amber-200/50"
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
                      className="h-8 px-2 md:h-10 md:px-4 text-xs md:text-sm bg-white/80 border-amber-200/50"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <span className="sm:hidden">Next</span>
                      <ChevronRight className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-2" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Page Content - Scrollable */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 md:p-6">
                  {pageLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto"></div>
                        <p className="mt-4 text-amber-800">Loading page content...</p>
                      </div>
                    </div>
                  ) : isGenerating ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-amber-700 mb-4">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div>
                        <span className="text-sm">Generating page content...</span>
                      </div>

                      {/* Show streaming content with markdown */}
                      <div className="prose prose-amber max-w-none">
                        <Markdown
                          components={{
                            h1: ({ children }) => <h1 className="text-2xl font-bold text-amber-900 mb-4">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xl font-semibold text-amber-900 mb-3">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-lg font-medium text-amber-900 mb-2">{children}</h3>,
                            p: ({ children }) => <p className="text-amber-900 leading-relaxed mb-4">{children}</p>,
                            em: ({ children }) => <em className="text-amber-800 italic">{children}</em>,
                            strong: ({ children }) => <strong className="text-amber-900 font-semibold">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-4 text-amber-900 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-4 text-amber-900 space-y-1">{children}</ol>,
                            blockquote: ({ children }) => <blockquote className="border-l-4 border-amber-300 pl-4 italic text-amber-800 mb-4">{children}</blockquote>,
                          }}
                        >
                          {messages[messages.length - 1]?.content || ''}
                        </Markdown>
                      </div>
                    </div>
                  ) : pageContent ? (
                    <div className="prose prose-amber max-w-none">
                      <Markdown
                        components={{
                          h1: ({ children }) => <h1 className="text-2xl font-bold text-amber-900 mb-4">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xl font-semibold text-amber-900 mb-3">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-lg font-medium text-amber-900 mb-2">{children}</h3>,
                          p: ({ children }) => <p className="text-amber-900 leading-relaxed mb-4">{children}</p>,
                          em: ({ children }) => <em className="text-amber-800 italic">{children}</em>,
                          strong: ({ children }) => <strong className="text-amber-900 font-semibold">{children}</strong>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-4 text-amber-900 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-4 text-amber-900 space-y-1">{children}</ol>,
                          blockquote: ({ children }) => <blockquote className="border-l-4 border-amber-300 pl-4 italic text-amber-800 mb-4">{children}</blockquote>,
                        }}
                      >
                        {pageContent}
                      </Markdown>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center space-y-4">
                        {!user ? (
                          <>
                            <p className="text-amber-600">This page hasn't been generated yet.</p>
                            <p className="text-amber-500 text-sm">Please sign in to generate new pages.</p>
                            <Button
                              onClick={() => window.location.href = '/'}
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              Sign In
                            </Button>
                          </>
                        ) : (
                          <p className="text-amber-600">No content available for this page.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>


        </div>
      </div>

      {/* Bookmarks List Modal */}
      <Dialog open={isBookmarksListOpen} onOpenChange={setIsBookmarksListOpen}>
        <DialogContent className="max-w-md max-h-[80vh] bg-white/95 backdrop-blur-sm border border-amber-200/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-amber-900 flex items-center gap-2">
              <List className="h-5 w-5" />
              Bookmarks for "{book?.title}"
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
            {bookmarksLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
              </div>
            ) : allBookmarks.length === 0 ? (
              <div className="text-center py-8 text-amber-600">
                <Bookmark className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No bookmarks yet.</p>
                <p className="text-xs text-amber-500 mt-1">Bookmark pages as you read to quickly return to them.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allBookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className={`
                      p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md
                      ${bookmark.page_number === currentPage
                        ? 'bg-amber-100 border-amber-300 shadow-sm'
                        : 'bg-white/80 border-amber-200/50 hover:bg-amber-50'
                      }
                    `}
                    onClick={() => jumpToBookmark(bookmark.page_number)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-amber-900">
                            Page {bookmark.page_number}
                          </span>
                          {bookmark.page_number === currentPage && (
                            <span className="text-xs bg-amber-600 text-white px-1.5 py-0.5 rounded">
                              Current
                            </span>
                          )}
                        </div>
                        {bookmark.note && (
                          <p className="text-sm text-amber-700 line-clamp-2">
                            {bookmark.note}
                          </p>
                        )}
                        <p className="text-xs text-amber-500 mt-1">
                          {bookmark.created_at ? new Date(bookmark.created_at).toLocaleDateString() : 'Unknown date'}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-amber-400 flex-shrink-0 ml-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4 border-t border-amber-200/30">
            <Button
              onClick={() => setIsBookmarksListOpen(false)}
              variant="outline"
              className="border-amber-200/50"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 