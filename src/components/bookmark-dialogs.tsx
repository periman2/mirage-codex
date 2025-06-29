'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Bookmark, ChevronRight, List } from 'lucide-react'

interface Bookmark {
  id: number
  page_number: number
  note: string | null
  created_at: string | null
}

interface BookmarkDialogsProps {
  // Create bookmark dialog props
  isCreateOpen: boolean
  onCreateOpenChange: (open: boolean) => void
  currentPage: number
  bookTitle: string
  onCreateBookmark: (note: string) => Promise<void>
  
  // Bookmarks list dialog props
  isListOpen: boolean
  onListOpenChange: (open: boolean) => void
  allBookmarks: Bookmark[]
  bookmarksLoading: boolean
  currentPageNumber: number
  onJumpToBookmark: (pageNumber: number) => void
}

export function BookmarkDialogs({
  isCreateOpen,
  onCreateOpenChange,
  currentPage,
  bookTitle,
  onCreateBookmark,
  isListOpen,
  onListOpenChange,
  allBookmarks,
  bookmarksLoading,
  currentPageNumber,
  onJumpToBookmark
}: BookmarkDialogsProps) {
  const [bookmarkNote, setBookmarkNote] = useState('')

  const handleCreateBookmark = async () => {
    await onCreateBookmark(bookmarkNote.trim() || '')
    setBookmarkNote('')
  }

  const handleCreateDialogClose = (open: boolean) => {
    if (!open) {
      setBookmarkNote('')
    }
    onCreateOpenChange(open)
  }

  return (
    <>
      {/* Bookmark Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={handleCreateDialogClose}>
        <DialogContent className="max-w-md bg-white/95 backdrop-blur-md border border-mirage-border-primary shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-mirage-text-primary">
              Add Bookmark
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <p className="text-sm text-mirage-text-secondary mb-3">
                Bookmarking page {currentPage} of "{bookTitle}"
              </p>
              <Label htmlFor="bookmark-note" className="text-sm font-medium text-mirage-text-primary">
                Note (optional)
              </Label>
              <Input
                id="bookmark-note"
                value={bookmarkNote}
                onChange={(e) => setBookmarkNote(e.target.value)}
                placeholder="Add a note about this page..."
                className="mt-1 bg-white/90 border-mirage-border-primary"
                maxLength={500}
              />
              <p className="text-xs text-mirage-text-muted/70 mt-1">
                {bookmarkNote.length}/500 characters
              </p>
            </div>
            <div className="flex space-x-2 pt-2">
              <Button
                onClick={() => handleCreateDialogClose(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateBookmark}
                className="flex-1"
                style={{
                  backgroundColor: 'rgb(217 119 6)',
                  borderColor: 'rgb(217 119 6)',
                  color: 'white'
                }}
              >
                Save Bookmark
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bookmarks List Modal */}
      <Dialog open={isListOpen} onOpenChange={onListOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] bg-white/95 backdrop-blur-md border border-mirage-border-primary shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-mirage-text-primary flex items-center gap-2">
              <List className="h-5 w-5" />
              Bookmarks for "{bookTitle}"
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
            {bookmarksLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'rgb(217 119 6)' }}></div>
              </div>
            ) : allBookmarks.length === 0 ? (
              <div className="text-center py-8 text-mirage-text-muted">
                <Bookmark className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No bookmarks yet.</p>
                <p className="text-xs text-mirage-text-light mt-1">Bookmark pages as you read to quickly return to them.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allBookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className={`
                      p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md
                      ${bookmark.page_number === currentPageNumber
                        ? 'bg-mirage-bg-tertiary border-mirage-border-primary shadow-sm'
                        : 'bg-white/90 border-mirage-border-primary hover:bg-white'
                      }
                    `}
                    onClick={() => onJumpToBookmark(bookmark.page_number)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-mirage-text-primary">
                            Page {bookmark.page_number}
                          </span>
                          {bookmark.page_number === currentPageNumber && (
                            <span 
                              className="text-xs text-white px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'rgb(217 119 6)' }}
                            >
                              Current
                            </span>
                          )}
                        </div>
                        {bookmark.note && (
                          <p className="text-sm text-mirage-text-tertiary line-clamp-2">
                            {bookmark.note}
                          </p>
                        )}
                        <p className="text-xs text-mirage-text-light mt-1">
                          {bookmark.created_at ? new Date(bookmark.created_at).toLocaleDateString() : 'Unknown date'}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-mirage-text-light flex-shrink-0 ml-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4 border-t border-mirage-border-primary">
            <Button
              onClick={() => onListOpenChange(false)}
              variant="outline"
              className="border-mirage-border-primary"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 