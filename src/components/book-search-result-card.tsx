'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparks } from 'iconoir-react'

// Transform database result to frontend-friendly format
type SearchResultBook = {
  id: string
  title: string
  summary: string
  pageCount: number
  coverUrl: string | null
  bookCoverPrompt: string | null
  author: {
    id: string
    penName: string
    bio: string | null
  }
  language: string
  sections: any[]
  edition: {
    id: string
    modelId: number
    modelName: string
  }
}

// Enhanced BookSearchResultCard component with proper loading states and shadow effects
export function BookSearchResultCard({ book }: { book: SearchResultBook }) {
  const router = useRouter()
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  const handleImageLoad = () => {
    setImageLoading(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

  const handleClick = () => {
    router.push(`/book/${book.id}?edition=${book.edition.id}`)
  }

  return (
    <div 
      onClick={handleClick}
      className="group cursor-pointer transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-xl rounded-xl overflow-hidden"
    >
      {/* Book Cover Container - Square format */}
      <div className="aspect-square w-full relative overflow-hidden shadow-sm">
        {/* Gradient background for light mode */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-50 to-gray-200 dark:from-amber-900 dark:to-amber-800" />
        
        {!imageError && (
          <>
            {/* Loading Spinner */}
            {imageLoading && (
              <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800 flex items-center justify-center z-10">
                <div className="flex flex-col items-center space-y-2">
                  <Sparks className="h-8 w-8 text-amber-600 dark:text-amber-300 animate-spin" />
                  <div className="text-sm text-amber-700 dark:text-amber-200 font-medium">
                    Loading...
                  </div>
                </div>
              </div>
            )}
            
            {/* Book Cover Image */}
            <img
              src={`/api/book/${book.id}/cover`}
              alt={`Cover of ${book.title}`}
              className={`w-full h-full object-cover transition-opacity duration-300 relative z-10 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </>
        )}
        
        {/* Book Title Overlay at top with strong shadow for visibility */}
        <div className="absolute top-3 left-3 right-3 z-20">
          <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2 px-3 py-2 rounded-lg bg-black/40 backdrop-blur-sm shadow-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {book.title}
          </h3>
        </div>
      </div>
      
      {/* Book Details Below Cover - Not overlapping */}
      <div className="w-full">
        {/* Blurred background for better readability */}
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-b-xl p-4 shadow-sm border border-white/20 dark:border-slate-700/50 border-t-0">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 line-clamp-1 mb-2">
            by {book.author.penName}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-3 leading-relaxed">
            {book.summary}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="truncate font-medium">{book.pageCount} pages</span>
          </div>
        </div>
      </div>
    </div>
  )
} 