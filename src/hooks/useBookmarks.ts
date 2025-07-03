import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useBookmark } from './useBookStats'
import { type User } from '@supabase/supabase-js'
import { type BookEdition } from './useBookData'

interface Bookmark {
  id: number
  page_number: number
  note: string | null
  created_at: string | null
}

interface UseBookmarksProps {
  user: User | null
  currentEdition: BookEdition | undefined
  currentPage: number
  isPageCached: boolean
  onPageChange: (pageNumber: number) => void
}

interface UseBookmarksReturn {
  // State
  allBookmarks: Bookmark[]
  bookmarksLoading: boolean
  isBookmarkDialogOpen: boolean
  isBookmarksListOpen: boolean
  existingBookmark: any // From useBookmark hook
  
  // Actions
  createBookmark: (note: string) => Promise<void>
  deleteBookmark: () => Promise<void>
  jumpToBookmark: (pageNumber: number) => void
  handleBookmark: () => Promise<void>
  handleOpenBookmarksList: () => void
  
  // Dialog handlers
  setIsBookmarkDialogOpen: (open: boolean) => void
  setIsBookmarksListOpen: (open: boolean) => void
}

export function useBookmarks({
  user,
  currentEdition,
  currentPage,
  isPageCached,
  onPageChange
}: UseBookmarksProps): UseBookmarksReturn {
  const queryClient = useQueryClient()
  
  // State
  const [allBookmarks, setAllBookmarks] = useState<Bookmark[]>([])
  const [bookmarksLoading, setBookmarksLoading] = useState(false)
  const [isBookmarkDialogOpen, setIsBookmarkDialogOpen] = useState(false)
  const [isBookmarksListOpen, setIsBookmarksListOpen] = useState(false)
  
  const { 
    data: existingBookmark, 
    isLoading: bookmarkLoading, 
    error: bookmarkError 
  } = useBookmark(user?.id, currentEdition?.id, currentPage, true)

  // Load all bookmarks for current edition
  const loadAllBookmarks = useCallback(async () => {
    if (!user || !currentEdition) return

    setBookmarksLoading(true)
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('id, page_number, note, created_at')
        .eq('user_id', user.id)
        .eq('edition_id', currentEdition.id)
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
  }, [user, currentEdition])

  // Jump to a bookmarked page
  const jumpToBookmark = useCallback((pageNumber: number) => {
    onPageChange(pageNumber)
    setIsBookmarksListOpen(false)
    toast.success(`Jumped to page ${pageNumber}`)
  }, [onPageChange])

  // Create a new bookmark
  const createBookmark = useCallback(async (note: string) => {
    if (!user || !currentEdition) return

    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .insert({
          user_id: user.id,
          edition_id: currentEdition.id,
          page_number: currentPage,
          note: note || null
        })
        .select('id, note')
        .single()

      if (error) {
        console.error('Error creating bookmark:', error)
        toast.error('Failed to save bookmark')
        return
      }

      // Invalidate bookmark queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['bookmark', user.id, currentEdition.id, currentPage] })
      setIsBookmarkDialogOpen(false)
      toast.success('Bookmark saved!')

      // Refresh bookmarks list
      loadAllBookmarks()
    } catch (error) {
      console.error('Error creating bookmark:', error)
      toast.error('Failed to save bookmark')
    }
  }, [user, currentEdition, currentPage, queryClient, loadAllBookmarks])

  // Delete existing bookmark
  const deleteBookmark = useCallback(async () => {
    if (!existingBookmark || !user || !currentEdition) return

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

      // Invalidate bookmark queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['bookmark', user.id, currentEdition.id, currentPage] })
      toast.success('Bookmark removed!')

      // Refresh bookmarks list
      loadAllBookmarks()
    } catch (error) {
      console.error('Error deleting bookmark:', error)
      toast.error('Failed to remove bookmark')
    }
  }, [existingBookmark, user, currentEdition, currentPage, queryClient, loadAllBookmarks])

  // Handle bookmark button click
  const handleBookmark = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to save bookmarks')
      return
    }

    if (existingBookmark) {
      await deleteBookmark()
    } else {
      setIsBookmarkDialogOpen(true)
    }
  }, [user, existingBookmark, deleteBookmark])

  // Handle opening bookmarks list
  const handleOpenBookmarksList = useCallback(() => {
    if (!user) {
      toast.error('Please sign in to view bookmarks')
      return
    }

    setIsBookmarksListOpen(true)
    loadAllBookmarks()
  }, [user, loadAllBookmarks])

  // Load bookmarks when user and edition are available
  useEffect(() => {
    if (user && currentEdition) {
      loadAllBookmarks()
    }
  }, [user?.id, currentEdition?.id, loadAllBookmarks])

  return {
    // State
    allBookmarks,
    bookmarksLoading,
    isBookmarkDialogOpen,
    isBookmarksListOpen,
    existingBookmark,
    
    // Actions
    createBookmark,
    deleteBookmark,
    jumpToBookmark,
    handleBookmark,
    handleOpenBookmarksList,
    
    // Dialog handlers
    setIsBookmarkDialogOpen,
    setIsBookmarksListOpen
  }
} 