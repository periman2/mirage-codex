'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Book, Heart, Users, List } from 'lucide-react'
import { type BookData, type BookEdition } from '@/hooks/useBookData'
import { type User } from '@supabase/supabase-js'
import { AuthorDialog } from './author-dialog'

interface BookStats {
  likes: number
  views: number
  userLiked: boolean
}

interface Bookmark {
  id: number
  page_number: number
  note: string | null
  created_at: string | null
}

interface BookInfoSidebarProps {
  book: BookData
  currentEdition: BookEdition | undefined
  isOpen: boolean
  onClose: () => void
  onOpen: () => void
  onEditionChange: (editionId: string) => void
  user: User | null
  bookStats: BookStats | undefined
  optimisticBookLike: { liked: boolean; count: number } | null
  onBookLike: () => void
  isBookLikePending: boolean
  allBookmarks: Bookmark[]
  onOpenBookmarksList: () => void
}

export function BookInfoSidebar({
  book,
  currentEdition,
  isOpen,
  onClose,
  onOpen,
  onEditionChange,
  user,
  bookStats,
  optimisticBookLike,
  onBookLike,
  isBookLikePending,
  allBookmarks,
  onOpenBookmarksList
}: BookInfoSidebarProps) {
  const [isAuthorDialogOpen, setIsAuthorDialogOpen] = useState(false)

  return (
    <>
      {/* Mobile Book Info Button */}
      <Button
        onClick={() => !isOpen && onOpen()}
        className="md:hidden fixed top-24 left-4 z-40 h-10 w-10 p-0 rounded-full shadow-lg"
        style={{
          backgroundColor: 'rgb(217 119 6)',
          borderColor: 'rgb(217 119 6)',
          color: 'white'
        }}
      >
        <Book className="h-5 w-5" style={{ color: 'white' }} />
      </Button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      )}

      {/* Sidebar */}
      <div className={`
        w-80 h-full bg-white/95 backdrop-blur-md border-r border-mirage-border-primary shadow-xl
        md:relative md:block md:translate-x-0
        ${isOpen
          ? 'fixed inset-y-0 left-0 z-50 translate-x-0 transition-transform duration-300 ease-out md:transition-none'
          : 'fixed inset-y-0 left-0 -translate-x-full transition-transform duration-300 ease-out md:transition-none md:translate-x-0'
        }
      `}>
        <div className="h-full overflow-y-auto">
          {/* Mobile Close Button */}
          <div className="md:hidden flex justify-between items-center p-4 border-b border-mirage-border-primary">
            <h2 className="text-lg font-semibold text-mirage-text-primary">
              Book Info
            </h2>
            <Button
              onClick={onClose}
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
              <h1 className="text-2xl font-bold text-mirage-text-primary leading-tight">
                {book.title}
              </h1>
              <p className="text-base text-mirage-text-tertiary font-medium">
                by{' '}
                <button
                  onClick={() => setIsAuthorDialogOpen(true)}
                  className="text-amber-600 hover:text-amber-700 hover:underline transition-colors cursor-pointer font-medium"
                >
                  {book.author.penName}
                </button>
              </p>
              <div className="space-y-1">
                <p className="text-sm text-mirage-text-muted">
                  {book.pageCount} pages • {book.language}
                </p>
                <p className="text-sm">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: 'rgb(217 119 6)' }}>
                    {book.genre.label}
                  </span>
                </p>
                {/* Book Stats with Like Button */}
                <div className="flex items-center space-x-4 pt-2">
                  <div className="flex items-center space-x-1 text-sm text-mirage-text-muted">
                    {user ? (
                      <button
                        onClick={onBookLike}
                        disabled={isBookLikePending}
                        className="flex items-center space-x-1 hover:text-red-500 transition-colors cursor-pointer"
                        title={`${optimisticBookLike?.liked ?? bookStats?.userLiked ? 'Unlike' : 'Like'} this book`}
                      >
                        <Heart className={`h-4 w-4 ${optimisticBookLike?.liked ?? bookStats?.userLiked ? 'fill-red-500 text-red-500' : ''}`} />
                        <span>{optimisticBookLike?.count ?? bookStats?.likes ?? book.stats?.likes ?? 0}</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <Heart className="h-4 w-4" />
                        <span>{bookStats?.likes || book.stats?.likes || 0}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-mirage-text-muted">
                    <Users className="h-4 w-4" />
                    <span>{bookStats?.views || book.stats?.views || 0}</span>
                  </div>
                </div>
              </div>
              
              {/* Edition Selection */}
              {book.editions.length > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="edition-select" className="text-sm font-medium text-mirage-text-primary">
                    Edition
                  </Label>
                  <Select value={currentEdition?.id || ''} onValueChange={onEditionChange}>
                    <SelectTrigger className="w-full bg-white/90 border-mirage-border-primary">
                      <SelectValue placeholder="Select edition" />
                    </SelectTrigger>
                    <SelectContent>
                      {book.editions.map((edition) => (
                        <SelectItem key={edition.id} value={edition.id}>
                          {edition.modelName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <p className="text-sm text-mirage-text-muted">
                Generated with {currentEdition?.modelName || 'Unknown Model'}
              </p>
            </div>

            {/* Book Summary */}
            <Dialog>
              <div className="bg-mirage-bg-tertiary/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-mirage-text-primary">Summary</h3>
                </div>
                <DialogTrigger asChild>
                  <div className="cursor-pointer">
                    <p className="text-sm text-mirage-text-secondary/80 leading-relaxed overflow-hidden" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {book.summary}
                    </p>
                    <p className="text-xs text-mirage-text-muted/70 italic mt-2 hover:text-mirage-text-secondary transition-colors">
                      Click to read full summary...
                    </p>
                  </div>
                </DialogTrigger>
              </div>
              <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-md border border-mirage-border-primary shadow-xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-mirage-text-primary">
                    {book.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <h4 className="text-lg font-semibold text-mirage-text-secondary mb-3">Summary</h4>
                  <p className="text-base text-mirage-text-primary leading-relaxed">
                    {book.summary}
                  </p>
                </div>
              </DialogContent>
            </Dialog>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* View Bookmarks Button */}
              {user ? (
                <Button
                  variant="outline"
                  size="default"
                  className="w-full flex items-center gap-2 h-10"
                  onClick={onOpenBookmarksList}
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
            </div>
          </div>
        </div>
      </div>

      {/* Author Dialog */}
      <AuthorDialog
        isOpen={isAuthorDialogOpen}
        onOpenChange={setIsAuthorDialogOpen}
        author={book.author}
        currentBookId={book.id}
      />
    </>
  )
} 