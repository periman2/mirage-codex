'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Bookmark, Share2, Eye, Heart, Type } from 'lucide-react'
import { CreditsIcon } from '@/components/ui/credits-icon'
import { toast } from 'sonner'
import Markdown from 'react-markdown'
import { useBookStats, useBookLike, useBookView, usePageStats, usePageLike, usePageView, usePageContent } from '@/hooks/useBookStats'
import { BookData } from '@/hooks/useBookData'
import { useBookmarks } from '@/hooks/useBookmarks'
import { usePageGenerationCreditCost } from '@/hooks/useCreditCosts'
import { useCredits } from '@/hooks/useCredits'
import { useAdjacentPages } from '@/lib/queries'
import { BookInfoSidebar } from '@/components/book-info-sidebar'
import { BookmarkDialogs } from '@/components/bookmark-dialogs'
import { PageTransitionLoading, PageLoading, InlineLoading } from '@/components/ui/loading'

interface BookDetailClientProps {
    bookId: string
    initialBookData: BookData
}

export default function BookDetailClient({ bookId, initialBookData }: BookDetailClientProps) {

    const { user, loading } = useAuth()

    if(loading) {
        return <div>Loading...</div>
    }

    const searchParams = useSearchParams()
    const router = useRouter()
    const editionId = searchParams?.get('edition') // Get edition from URL params

    // Use the server-provided book data
    const book = initialBookData

    // Determine current edition from URL params or default to first edition
    const currentEdition = book.editions.find(ed => ed.id === editionId) || book.editions[0]

    // Get credit cost for page generation
    const { data: pageGenerationCreditCost } = usePageGenerationCreditCost(currentEdition?.modelId || null)

    // Credits hook for invalidation and checking balance
    const { invalidateCredits, credits: userCredits } = useCredits()

    const [currentPage, setCurrentPage] = useState(0);


    const [pageContent, setPageContent] = useState<string>('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [isPageCached, setIsPageCached] = useState(false) // Track if page content is cached/saved
    const [isMobileBookInfoOpen, setIsMobileBookInfoOpen] = useState(false)
    const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large' | 'xl' | 'xxl'>('medium')

    // Optimistic UI state
    const [optimisticBookLike, setOptimisticBookLike] = useState<{ liked: boolean; count: number } | null>(null)
    const [optimisticPageLike, setOptimisticPageLike] = useState<{ liked: boolean; count: number } | null>(null)

    // Enhanced page transition state with fade control
    const [isPageTransitioning, setIsPageTransitioning] = useState(false)
    const [previousPageContent, setPreviousPageContent] = useState('')
    const [showNewContent, setShowNewContent] = useState(true) // Controls when new content should fade in
    const [streamingContentKey, setStreamingContentKey] = useState(0) // Force re-render for streaming animation

    // Get adjacent pages to check if they're already generated (only when we need navigation hints)
    const { data: adjacentPages, isLoading: isAdjacentPagesLoading } = useAdjacentPages(
        currentEdition?.id,
        currentPage,
        book.pageCount || 0
    )

    // Ref to prevent duplicate generation requests
    const generationInProgress = useRef(false)

    // Check if a specific page will require generation (not cached)
    const willPageRequireGeneration = (pageNumber: number) => {
        if (!user) return false // Can't generate without authentication

        if (pageNumber <= 0) return false;
        if (book.pageCount && pageNumber > book.pageCount) return false;

        // For current page, use our local cache status
        if (pageNumber === currentPage) {
            return !isPageCached
        }

        // For adjacent pages, use the data from adjacentPages hook
        if (pageNumber === currentPage - 1) {
            return !adjacentPages?.prevPage // Will need generation if page doesn't exist
        }

        if (pageNumber === currentPage + 1) {
            return !adjacentPages?.nextPage // Will need generation if page doesn't exist
        }

        // For other pages, we don't have data so assume they might need generation
        return true
    }

    // Helper function to check if user has enough credits for page generation
    const hasEnoughCreditsForPage = (pageNumber: number) => {
        if (!user) return false // Not authenticated
        if (!willPageRequireGeneration(pageNumber)) return true // Page doesn't need generation
        if (!pageGenerationCreditCost || !userCredits) return true // Can't check, assume true

        return userCredits.credits >= pageGenerationCreditCost
    }

    // Helper function to render credit cost indicator with loading state
    const renderCreditCost = (pageNumber: number, isSmall: boolean = false) => {
        if (!user) return null

        // Check if we're still loading adjacent pages data
        if (isAdjacentPagesLoading && (pageNumber === currentPage - 1 || pageNumber === currentPage + 1)) {
            return (
                <span className="ml-1">
                    (<div className={`animate-spin rounded-full border-b-2 border-current inline-block ${isSmall ? 'h-2 w-2' : 'h-3 w-3'}`}></div>)
                </span>
            )
        }

        // Show credit cost if page will require generation
        if (willPageRequireGeneration(pageNumber) && pageGenerationCreditCost) {
            return (
                <span className="ml-1">
                    (<CreditsIcon className={`inline ${isSmall ? 'h-2 w-2 mx-0.5' : 'h-3 w-3 mx-1'}`} />{pageGenerationCreditCost})
                </span>
            )
        }

        return null
    }

    // Function to find which section the current page belongs to
    const getCurrentSection = () => {
        if (!book.sections || !currentPage) return null

        return book.sections.find(section =>
            currentPage >= section.fromPage && currentPage <= section.toPage
        )
    }

    // Get the current section
    const currentSection = getCurrentSection()

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
            case 'xxl':
                return 'text-2xl leading-relaxed'
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

            // Simple markdown image syntax - let the browser handle loading
            return `\n\n![Scene: ${trimmedPrompt}](${imageUrl})\n*${trimmedPrompt}*\n\n`
        })

        return processedContent
    }

    // Book-level stats hooks (only enabled when page content is cached/saved)
    const { data: bookStats } = useBookStats(bookId, isPageCached)
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
                    console.log('🔄 Page content saved to database')
                    setPageContent(message.content) // Store raw content with patterns
                    setIsPageCached(true) // Mark as cached since we successfully saved to database
                    
                    // Smooth transition to show new content
                    setTimeout(() => {
                        setIsPageTransitioning(false) // End transition when generation completes
                        setShowNewContent(true) // Fade in new content
                    }, 150) // Small delay for smooth transition

                    // Invalidate credits cache since credits were consumed for page generation
                    invalidateCredits()

                    console.log('✅ Page content saved to database')
                } catch (error) {
                    console.error('❌ Failed to save page content:', error)
                    toast.error('Failed to save page content')
                    setIsPageCached(false) // Keep as false if save failed
                    setIsPageTransitioning(false) // End transition on error
                    setShowNewContent(true)
                }
            }
            setIsGenerating(false)
            generationInProgress.current = false
        },
        onError: async (error) => {
            console.error('❌ Page generation error:', error)

            // Try to parse the error response to check for credit-related errors
            let errorMessage = 'Failed to generate page content'

            // Check if error contains response information
            if (error.message) {
                try {
                    // If the error message contains JSON, it might be from our API
                    const errorData = JSON.parse(error.message)
                    if (errorData.creditsNeeded && errorData.message) {
                        errorMessage = errorData.message
                    }
                } catch {
                    // If parsing fails, check for specific error messages
                    if (error.message.includes('credits') || error.message.includes('402')) {
                        errorMessage = 'Insufficient credits for page generation. Please upgrade your plan or add more credits.'
                    }
                }
            }

            toast.error(errorMessage)
            setIsGenerating(false)
            setIsPageTransitioning(false) // End transition on error
            setShowNewContent(true)
            generationInProgress.current = false
        }
    })
    
    const {
        isLoading: isPageContentLoading
    } = usePageContent(
        bookId,
        currentPage,
        currentEdition?.id,
        true,
        // onSuccess callback
        (data) => {
            console.log('📄 Page content loaded:', data);
            if (data.exists && data.content) {

                // Store the RAW content (with [p=...] patterns) so processImagePrompts can find them
                setPageContent(data.content);
                setIsPageCached(true);
                
                // Smooth transition to show cached content
                setTimeout(() => {
                    setIsPageTransitioning(false); // End transition when content loads
                    setShowNewContent(true); // Fade in cached content
                }, 150); // Small delay for smooth transition
                
                console.log('✅ Page content set from cache (keeping original [p=...] patterns)');

                // Track page view when content is loaded from cache (debounced to avoid spam)
                if (currentEdition?.id) {
                    setTimeout(() => trackPageView(currentEdition.id), 100);
                }
            } else if (!data.exists && !isGenerating && !generationInProgress.current) {
                // Content doesn't exist, trigger generation if user is authenticated
                console.log('🔄 Page content missing, starting generation', user);
                if (user) {
                    console.log('🔄 Page content missing, starting generation');
                    startGeneration();
                } else {
                    setIsPageTransitioning(false); // End transition even if no content for unauthenticated users
                    setShowNewContent(true);
                }
            }
        },
        // onError callback
        (error) => {
            console.error('❌ Page content loading error:', error);
            toast.error('Failed to load page content');
            setPageContent('');
            setIsPageCached(false);
            setIsPageTransitioning(false);
            setShowNewContent(true);
        }
    )

    // Page-level stats hooks (only fetch if page content is cached/saved and not transitioning)
    const shouldFetchPageStats = isPageCached && !isGenerating && !isPageTransitioning && chatStatus !== 'streaming'
    const { data: pageStats } = usePageStats(
        bookId,
        currentPage,
        currentEdition?.id,
        shouldFetchPageStats
    )
    const pageLikeMutation = usePageLike(bookId, currentPage)
    const { trackView: trackPageView } = usePageView(bookId, currentPage)

    // Bookmarks hook - handles all bookmark-related logic (only when page is stable)
    const bookmarks = useBookmarks({
        user,
        currentEdition,
        currentPage,
        isPageCached: isPageCached && !isPageTransitioning, // Only when page is stable
        onPageChange: setCurrentPage
    })

    // Function to update URL with current page and edition
    const updatePageURL = (pageNumber: number, newEditionId?: string, createHistoryEntry: boolean = true) => {
        const params = new URLSearchParams()
        const editionToUse = newEditionId || currentEdition?.id
        if (editionToUse) {
            params.set('edition', editionToUse)
        }
        if (pageNumber > 1) {
            params.set('page', pageNumber.toString())
        }

        const newURL = `/book/${bookId}${params.toString() ? '?' + params.toString() : ''}`

        if (createHistoryEntry) {
            // Create a new history entry for page navigation
            router.push(newURL, { scroll: false })
        } else {
            // Replace current history entry (for initial loads)
            router.replace(newURL, { scroll: false })
        }
    }

    // Function to handle edition switching
    const handleEditionChange = (newEditionId: string) => {
        // Reset page content when switching editions
        setPageContent('')
        setIsPageCached(false)

        // Update URL with new edition (create history entry for edition changes)
        updatePageURL(currentPage, newEditionId, true)

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
        setStreamingContentKey(prev => prev + 1) // Reset streaming animation

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

    // Update URL when book loads (but don't create history entries for initial sync)
    useEffect(() => {
        if (book && currentPage) {
            updatePageURL(currentPage, undefined, false) // Don't create history entry for initial sync
        }
    }, [currentEdition?.id, currentPage]) // Removed currentPage dependency to avoid creating entries on every page change

    // Track book view when page content is cached (book successfully loaded)
    useEffect(() => {
        if (book && isPageCached) {
            trackBookView()
        }
    }, [book.id, isPageCached])

    // Handle browser back/forward navigation
    useEffect(() => {
        const pageParam = searchParams?.get('page')
        const urlPage = pageParam ? parseInt(pageParam) : 1

        // Update current page if URL changed (e.g., browser back/forward)
        if (urlPage !== currentPage && urlPage > 0) {
            console.log(`📖 Browser navigation: page ${currentPage} → ${urlPage}`)
            setCurrentPage(urlPage)
        }
    }, [searchParams])

    // Enhanced smooth page transitions with fade effects
    useEffect(() => {
        // When page changes, start transition and preserve previous content
        setShowNewContent(false) // Fade out current content first
        
        setTimeout(() => {
            setIsPageTransitioning(true)
            setPreviousPageContent(pageContent)
            
            // Reset page state for new page
            setPageContent('')
            setIsPageCached(false)
        }, 150) // Allow fade out to complete before starting transition
        
        // Scroll to top of the page content when changing pages
        // Use a delay to ensure smooth transition
        setTimeout(() => {
            // Find the scrollable content area and scroll to top
            const contentArea = document.querySelector('.page-content-scroll')
            if (contentArea) {
                contentArea.scrollTo({ top: 0, behavior: 'smooth' })
            } else {
                // Fallback to window scroll if content area not found
                window.scrollTo({ top: 0, behavior: 'smooth' })
            }
        }, 200)
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

            // Check if user has enough credits if page will require generation
            if (willPageRequireGeneration(newPage) && !hasEnoughCreditsForPage(newPage)) {
                toast.error(`You need ${pageGenerationCreditCost || 0} credits to generate this page. Please upgrade your plan or add more credits.`)
                return
            }

            console.log(`➡️ Navigating to next page: ${currentPage} → ${newPage}`)
            setCurrentPage(newPage)
            updatePageURL(newPage, undefined, true) // Create history entry for navigation
        }
    }

    const prevPage = () => {
        if (currentPage > 1) {
            const newPage = currentPage - 1

            // Check if user has enough credits if page will require generation
            if (willPageRequireGeneration(newPage) && !hasEnoughCreditsForPage(newPage)) {
                toast.error(`You need ${pageGenerationCreditCost || 0} credits to generate this page. Please upgrade your plan or add more credits.`)
                return
            }

            console.log(`⬅️ Navigating to previous page: ${currentPage} → ${newPage}`)
            setCurrentPage(newPage)
            updatePageURL(newPage, undefined, true) // Create history entry for navigation
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
            const currentCount = bookStats?.likes ?? book.stats?.likes ?? 0
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

    // Book data is provided by server component, so no loading states needed

    return (
        <div className="h-[calc(100vh-4rem)] bg-mirage-gradient relative">
            <div className="flex h-full">
                {/* Left Sidebar - Book Information */}
                <BookInfoSidebar
                    book={book}
                    currentEdition={currentEdition}
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
                <div className="flex-1 p-4 md:p-4 pt-8 md:pt-4 flex flex-col">
                    <Card className="flex-1 bg-white/95 backdrop-blur-md border border-mirage-border-primary shadow-xl rounded-xl overflow-hidden">
                        <div className="h-full flex flex-col">
                            <div className="px-4 py-3 md:px-6 md:py-4 border-b border-mirage-border-primary bg-white/90 flex-shrink-0">
                                {/* Section Information */}
                                {currentSection && (
                                    <div className="mb-3 pb-3 border-b border-mirage-border-primary/30">
                                        <h3 className="text-sm font-medium text-mirage-text-primary">
                                            {currentSection.title}
                                        </h3>
                                    </div>
                                )}

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-3">
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
                                                        <SelectItem value="xxl" className="text-2xl">Extra Extra Large</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Page Content - Scrollable */}
                            <div className="flex-1 overflow-y-auto page-content-scroll">
                                <div className="p-4 md:p-6">
                                    {isPageContentLoading ? (
                                        <PageLoading message="Loading page content..." />
                                    ) : isGenerating ? (
                                        <div className="space-y-4">
                                            <div className="mb-4">
                                                <InlineLoading 
                                                    message="Generating page content..." 
                                                    showMessage={true}
                                                    className="text-mirage-text-tertiary"
                                                />
                                            </div>

                                            {/* Show streaming content with enhanced fade-in markdown */}
                                            <div 
                                                key={streamingContentKey}
                                                className="prose prose-amber max-w-none animate-in fade-in duration-300"
                                                style={{
                                                    animation: 'fadeInGently 400ms ease-out forwards'
                                                }}
                                            >
                                                <style jsx>{`
                                                    @keyframes fadeInGently {
                                                        from { 
                                                            opacity: 0; 
                                                        }
                                                        to { 
                                                            opacity: 1; 
                                                        }
                                                    }
                                                    @keyframes streamingGlow {
                                                        0%, 100% { opacity: 0.7; }
                                                        50% { opacity: 1; }
                                                    }
                                                    .streaming-text {
                                                        animation: streamingGlow 2s ease-in-out infinite;
                                                    }
                                                `}</style>
                                                <Markdown
                                                    components={{
                                                        h1: ({ children }) => <h1 className="text-2xl font-bold text-mirage-text-primary mb-4 streaming-text">{children}</h1>,
                                                        h2: ({ children }) => <h2 className="text-xl font-semibold text-mirage-text-primary mb-3 streaming-text">{children}</h2>,
                                                        h3: ({ children }) => <h3 className="text-lg font-medium text-mirage-text-primary mb-2 streaming-text">{children}</h3>,
                                                        p: ({ children }) => <p className={`text-mirage-text-primary mb-4 streaming-text ${getFontSizeClasses(fontSize)}`}>{children}</p>,
                                                        em: ({ children }) => <em className="text-mirage-text-secondary italic streaming-text">{children}</em>,
                                                        strong: ({ children }) => <strong className="text-mirage-text-primary font-semibold streaming-text">{children}</strong>,
                                                        ul: ({ children }) => <ul className={`list-disc list-inside mb-4 text-mirage-text-primary space-y-1 streaming-text ${getFontSizeClasses(fontSize)}`}>{children}</ul>,
                                                        ol: ({ children }) => <ol className={`list-decimal list-inside mb-4 text-mirage-text-primary space-y-1 streaming-text ${getFontSizeClasses(fontSize)}`}>{children}</ol>,
                                                        blockquote: ({ children }) => <blockquote className={`border-l-4 border-mirage-border-primary pl-4 italic text-mirage-text-secondary mb-4 streaming-text ${getFontSizeClasses(fontSize)}`}>{children}</blockquote>,
                                                        img: ({ src, alt, ...props }) => (
                                                            <img
                                                                src={src}
                                                                alt={alt}
                                                                className="w-full max-w-2xl mx-auto my-6 rounded-lg shadow-lg hover:scale-105 transition-transform duration-300 streaming-text"
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
                                    ) : pageContent || (isPageTransitioning && previousPageContent) ? (
                                        <div className="relative">
                                            {/* Page transition loading indicator */}
                                            {isPageTransitioning && <PageTransitionLoading />}
                                            <div 
                                                className={`prose prose-amber max-w-none transition-opacity duration-300 ease-in-out ${
                                                    isPageTransitioning 
                                                        ? 'opacity-30' 
                                                        : showNewContent 
                                                            ? 'opacity-100' 
                                                            : 'opacity-0'
                                                }`}
                                            >
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
                                                    {pageContent ? processedPageContent : processImagePrompts(previousPageContent)}
                                                </Markdown>
                                            </div>
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
                                            Page {currentPage} of {book.pageCount || '?'}
                                        </span>
                                    </div>

                                    {/* Navigation Buttons */}
                                    <div className="flex space-x-2 md:space-x-3">
                                        <Button
                                            onClick={prevPage}
                                            disabled={currentPage <= 1 || isGenerating}
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-2 md:h-10 md:px-4 text-xs md:text-sm bg-white/90 border-mirage-border-primary"
                                        >
                                            <ChevronLeft className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                                            <span className="hidden sm:inline">
                                                Previous
                                                {renderCreditCost(currentPage - 1, false)}
                                            </span>
                                            <span className="sm:hidden">
                                                Prev
                                                {renderCreditCost(currentPage - 1, true)}
                                            </span>
                                        </Button>
                                        <Button
                                            onClick={nextPage}
                                            disabled={!book || currentPage >= book.pageCount || isGenerating}
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-2 md:h-10 md:px-4 text-xs md:text-sm bg-white/90 border-mirage-border-primary"
                                        >
                                            <span className="hidden sm:inline">
                                                Next
                                                {renderCreditCost(currentPage + 1, false)}
                                            </span>
                                            <span className="sm:hidden">
                                                Next
                                                {renderCreditCost(currentPage + 1, true)}
                                            </span>
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
                bookTitle={book.title || ''}
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