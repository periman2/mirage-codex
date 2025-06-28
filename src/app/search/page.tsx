'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useLanguages, useGenres, useTags, useTagsByGenre, useModels } from '@/lib/queries'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, Sparks, Book, ArrowLeft, ArrowRight } from 'iconoir-react'
import { toast } from 'sonner'
import { Database } from '@/lib/database.types'

// Use database types for better type safety and consistent naming
type DatabaseSearchResult = Database['public']['Functions']['get_search_results']['Returns'][0]

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
}

// Enhanced BookCard component with proper loading states
function BookCard({ book }: { book: SearchResultBook }) {
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  const handleImageLoad = () => {
    setImageLoading(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

  return (
    <div className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl rounded-lg overflow-hidden">
      {/* Book Cover Container - Square format */}
      <div className="aspect-square w-full relative overflow-hidden shadow-md">
        {/* Gradient background for light mode */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-50 to-gray-200 dark:from-amber-900 dark:to-amber-800" />
        
        {!imageError && (
          <>
            {/* Loading Spinner */}
            {imageLoading && (
              <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800 flex items-center justify-center z-10">
                <div className="flex flex-col items-center space-y-2">
                  <Sparks className="h-6 w-6 text-amber-600 dark:text-amber-300 animate-spin" />
                  <div className="text-xs text-amber-700 dark:text-amber-200 font-medium">
                    Generating...
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
        <div className="absolute top-4 left-4 right-4 z-20">
          <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2 px-3 py-2 rounded-lg bg-black/30 backdrop-blur-sm shadow-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {book.title}
          </h3>
        </div>
      </div>
      
      {/* Book Details Below Cover - Not overlapping */}
      <div className="w-full">
        {/* Blurred background for better readability */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-b-lg p-4 shadow-lg border border-white/20 dark:border-slate-700/50 border-t-0">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 line-clamp-1 mb-2">
            by {book.author.penName}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-3 leading-relaxed">
            {book.summary}
          </p>
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span className="truncate font-medium">{book.pageCount} pages</span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface SearchResult {
  searchId: string
  books: SearchResultBook[]
  cached: boolean
}

interface SearchRequest {
  freeText?: string
  languageCode: string
  genreSlug: string
  tagSlugs: string[]
  modelId: number
  pageNumber: number
}

export default function SearchPage() {
  const { user } = useAuth()
  const { data: languages } = useLanguages()
  const { data: genres } = useGenres()
  const { data: models } = useModels()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [selectedGenre, setSelectedGenre] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Set default model to gemini-2.5-flash-lite when models are loaded
  const defaultModel = useMemo(() => {
    return models?.find(m => m.name === 'gemini-2.5-flash-lite')?.id || null
  }, [models])

  // Set default model when it becomes available
  useMemo(() => {
    if (defaultModel && selectedModel === null) {
      setSelectedModel(defaultModel)
    }
  }, [defaultModel, selectedModel])
  
  // Get the genre ID for selected genre (only when genres are loaded)
  const selectedGenreData = useMemo(() => {
    return genres?.find(g => g.slug === selectedGenre)
  }, [genres, selectedGenre])
  
  const { data: genreTags } = useTagsByGenre(selectedGenreData?.id)

  // Use genre-specific tags if available, fallback to all tags
  const availableTags = useMemo(() => {
    if (!selectedGenre) return []
    
    // Use genre-specific tags if available, otherwise fallback to all tags
    if (genreTags && genreTags.length > 0) {
      return genreTags
    }
    
    // Fallback to all active tags if no genre-specific tags found
    return []
  }, [selectedGenre, genreTags])

  // Reset selected tags when genre changes
  const handleGenreChange = (genreSlug: string) => {
    setSelectedGenre(genreSlug)
    setSelectedTags([]) // Clear tags when genre changes
    setCurrentPage(1) // Reset to first page when genre changes
  }

  // Handle page changes
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    // Trigger new search with the new page
    if (selectedGenre && selectedModel) {
      searchMutation.mutate({
        freeText: searchQuery.trim() || undefined,
        languageCode: selectedLanguage,
        genreSlug: selectedGenre,
        tagSlugs: selectedTags,
        modelId: selectedModel,
        pageNumber: newPage,
      })
    }
  }

  const handleTagToggle = (tagSlug: string) => {
    setSelectedTags(prev => 
      prev.includes(tagSlug) 
        ? prev.filter(t => t !== tagSlug)
        : [...prev, tagSlug]
    )
  }

  // TanStack Query mutation for search
  const searchMutation = useMutation({
    mutationFn: async (params: SearchRequest): Promise<SearchResult> => {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate books')
      }

      return response.json()
    },
    onSuccess: (data) => {
      if (data.cached) {
        toast.success(`Found cached results for page ${currentPage} - no credits used!`)
      } else {
        toast.success(`Generated ${data.books.length} new books for page ${currentPage}!`)
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to generate books')
    },
  })

  const handleSearch = () => {
    if (!selectedGenre) {
      toast.error('Please select a genre')
      return
    }

    if (!selectedModel) {
      toast.error('Please select a model')
      return
    }

    // Reset to page 1 for new searches
    setCurrentPage(1)

    searchMutation.mutate({
      freeText: searchQuery.trim() || undefined,
      languageCode: selectedLanguage,
      genreSlug: selectedGenre,
      tagSlugs: selectedTags,
      modelId: selectedModel,
      pageNumber: 1, // Always start from page 1 for new searches
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !searchMutation.isPending && selectedGenre && selectedModel) {
      handleSearch()
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white/20 dark:bg-transparent backdrop-blur-sm rounded-3xl p-8 border border-amber-200/30 dark:border-amber-200/40">
            <Book className="h-16 w-16 mx-auto mb-4 text-amber-600 dark:text-amber-300" />
            <h1 className="text-2xl font-bold text-slate-800 dark:text-amber-100 mb-4">
              Authentication Required
            </h1>
            <p className="text-slate-600 dark:text-amber-50 mb-6">
              Please sign in to access the Search feature.
            </p>
            <Button 
              onClick={() => window.location.href = '/'} 
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Go Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-amber-100 mb-6">
            Dive into infinity
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-amber-50 max-w-2xl mx-auto mb-8 leading-relaxed">
            Search through the mirage of possibilities. Describe your ideal book and let it be found within the codex.
          </p>

          {/* Main Search Input */}
          <div className="relative max-w-2xl mx-auto mb-8">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe your ideal book... (e.g., A mystery novel set in Victorian London)"
              className="h-16 text-xl bg-white/80 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-200/30 pr-16"
            />
            <Button
              onClick={handleSearch}
              disabled={searchMutation.isPending || !selectedGenre || !selectedModel}
              className="absolute right-2 top-2 h-12 w-12 p-0 bg-amber-600 hover:bg-amber-700"
            >
              {searchMutation.isPending ? (
                <Sparks className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Search Parameters */}
        <Card className="bg-white/60 dark:bg-transparent backdrop-blur-sm border border-amber-200/30 dark:border-amber-200/40 mb-8 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl text-slate-800 dark:text-amber-100">
              Search Parameters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Language Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium text-slate-700 dark:text-amber-200">Language</Label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="h-12 text-base bg-white/80 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-200/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages?.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code} className="text-base">
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Genre Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium text-slate-700 dark:text-amber-200">Genre *</Label>
                <Select value={selectedGenre} onValueChange={handleGenreChange}>
                  <SelectTrigger className="h-12 text-base bg-white/80 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-200/30">
                    <SelectValue placeholder="Select a genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {genres?.map((genre) => (
                      <SelectItem key={genre.slug} value={genre.slug} className="text-base">
                        {genre.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Model Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium text-slate-700 dark:text-amber-200">AI Model</Label>
                <Select 
                  value={selectedModel?.toString() || ''} 
                  onValueChange={(value) => setSelectedModel(parseInt(value))}
                >
                  <SelectTrigger className="h-12 text-base bg-white/80 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-200/30">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models?.map((model) => (
                      <SelectItem key={model.id} value={model.id.toString()} className="text-base">
                        {model.model_domains?.label} - {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Button for smaller screens */}
              <div className="space-y-3 md:hidden">
                <Label className="text-base font-medium text-slate-700 dark:text-amber-200">Action</Label>
                <Button 
                  onClick={handleSearch}
                  disabled={searchMutation.isPending || !selectedGenre || !selectedModel}
                  className="w-full h-12 text-base bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {searchMutation.isPending ? (
                    <>
                      <Sparks className="h-5 w-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Tags Selection */}
            {selectedGenre && availableTags.length > 0 && (
              <div className="mt-8 space-y-4">
                <Label className="text-base font-medium text-slate-700 dark:text-amber-200">
                  Tags for {genres?.find(g => g.slug === selectedGenre)?.label} (optional)
                </Label>
                <div className="flex flex-wrap gap-3 max-h-40 overflow-y-auto">
                  {availableTags.map((tag) => (
                    <Badge
                      key={tag.slug}
                      variant={selectedTags.includes(tag.slug) ? "default" : "outline"}
                      className={`cursor-pointer transition-colors text-sm px-3 py-2 ${
                        selectedTags.includes(tag.slug)
                          ? "bg-amber-600 text-white hover:bg-amber-700"
                          : "bg-white/80 dark:bg-amber-950/20 text-slate-700 dark:text-amber-200 hover:bg-white dark:hover:bg-amber-950/40"
                      }`}
                      onClick={() => handleTagToggle(tag.slug)}
                    >
                      {tag.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {searchMutation.isPending ? (
          <Card className="bg-white/60 dark:bg-transparent backdrop-blur-sm border border-amber-200/30 dark:border-amber-200/40 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Sparks className="h-12 w-12 text-amber-600 dark:text-amber-300 animate-spin" />
                  <div className="absolute inset-0 rounded-full border-2 border-amber-200/30 dark:border-amber-300/30 animate-pulse"></div>
                </div>
                <div className="space-y-3 text-center">
                  <h3 className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-amber-100">
                    Weaving your query into existence...
                  </h3>
                  <p className="text-lg text-slate-600 dark:text-amber-50 max-w-md">
                    Our AI is crafting books tailored to your search. This may take a moment.
                  </p>
                </div>
                <div className="flex space-x-1 mt-4">
                  <div className="w-2 h-2 bg-amber-600 dark:bg-amber-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-amber-600 dark:bg-amber-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-amber-600 dark:bg-amber-300 rounded-full animate-bounce"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : searchMutation.data ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl md:text-3xl font-semibold text-slate-800 dark:text-amber-100">
                Books (Page {currentPage})
              </h2>
              {searchMutation.data.cached && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-base px-3 py-2">
                  Cached Result
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {searchMutation.data.books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-center space-x-6 mt-8">
              <Button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || searchMutation.isPending}
                variant="outline"
                className="h-12 px-6 text-base bg-white/80 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-200/30"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Previous
              </Button>
              
              <div className="flex items-center space-x-2">
                <span className="text-slate-600 dark:text-amber-200 text-lg font-medium">
                  Page {currentPage}
                </span>
              </div>

              <Button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={searchMutation.isPending}
                variant="outline"
                className="h-12 px-6 text-base bg-white/80 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-200/30"
              >
                Next
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <Card className="bg-white/60 dark:bg-transparent backdrop-blur-sm border border-amber-200/30 dark:border-amber-200/40 shadow-sm">
            <CardContent className="p-12 text-center">
              <Book className="h-16 w-16 mx-auto mb-6 text-amber-400 dark:text-amber-300" />
              <p className="text-lg text-slate-600 dark:text-amber-50">
                Select a genre and describe your ideal book to get started.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 