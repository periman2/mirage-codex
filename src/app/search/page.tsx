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
import { BookSearchResultCard } from '@/components/book-search-result-card'
import { Search, Sparks, Book, ArrowLeft, ArrowRight, Filter, WarningTriangle, Refresh } from 'iconoir-react'
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

// Type for tracking the current paginated search parameters
interface PaginatedSearchState {
  freeText: string
  genreSlug: string
  tagSlugs: string[]
  modelId: number
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
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  
  // Track the search parameters that correspond to the current paginated results
  const [paginatedSearchState, setPaginatedSearchState] = useState<PaginatedSearchState | null>(null)

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

  // Set default genre to first available genre
  useMemo(() => {
    if (genres && genres.length > 0 && !selectedGenre) {
      setSelectedGenre(genres[0].slug)
    }
  }, [genres, selectedGenre])
  
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

  // Check if current form state differs from paginated search state
  const hasSearchParametersChanged = useMemo(() => {
    if (!paginatedSearchState || currentPage === 1) return false
    
    return (
      searchQuery.trim() !== paginatedSearchState.freeText ||
      selectedGenre !== paginatedSearchState.genreSlug ||
      JSON.stringify([...selectedTags].sort()) !== JSON.stringify([...paginatedSearchState.tagSlugs].sort()) ||
      selectedModel !== paginatedSearchState.modelId
    )
  }, [searchQuery, selectedGenre, selectedTags, selectedModel, paginatedSearchState, currentPage])

  // Reset to paginated search state
  const resetToPaginatedSearch = () => {
    if (!paginatedSearchState) return
    
    setSearchQuery(paginatedSearchState.freeText)
    setSelectedGenre(paginatedSearchState.genreSlug)
    setSelectedTags([...paginatedSearchState.tagSlugs])
    setSelectedModel(paginatedSearchState.modelId)
  }

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
    if (selectedGenre && selectedModel && paginatedSearchState) {
      searchMutation.mutate({
        freeText: paginatedSearchState.freeText || undefined,
        languageCode: selectedLanguage,
        genreSlug: paginatedSearchState.genreSlug,
        tagSlugs: paginatedSearchState.tagSlugs,
        modelId: paginatedSearchState.modelId,
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
    onSuccess: (data, variables) => {
      // Update paginated search state when search succeeds
      setPaginatedSearchState({
        freeText: variables.freeText || '',
        genreSlug: variables.genreSlug,
        tagSlugs: [...variables.tagSlugs],
        modelId: variables.modelId
      })
      
      if (data.cached) {
        toast.success(`Found cached results for page ${variables.pageNumber} - no credits used!`)
      } else {
        toast.success(`Generated ${data.books.length} new books for page ${variables.pageNumber}!`)
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
    <div className="flex h-[calc(100vh-4rem)] relative bg-slate-100/30 dark:bg-slate-900/30 p-4 gap-4">
      {/* Mobile Filter Button */}
      <Button
        onClick={() => setIsMobileFiltersOpen(true)}
        className="md:hidden fixed top-20 left-8 z-50 h-10 w-10 p-0 bg-amber-600 hover:bg-amber-700 rounded-full shadow-lg"
      >
        <Filter className="h-5 w-5" />
      </Button>

      {/* Mobile Overlay */}
      {isMobileFiltersOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsMobileFiltersOpen(false)} />
      )}

      {/* Left Sidebar - Filters */}
      <div className={`
        w-80 flex-shrink-0 overflow-y-auto
        md:relative md:block md:translate-x-0
        ${isMobileFiltersOpen 
          ? 'fixed inset-y-0 left-0 z-50 translate-x-0 transition-transform duration-300 ease-out md:transition-none' 
          : 'fixed inset-y-0 left-0 -translate-x-full transition-transform duration-300 ease-out md:transition-none md:translate-x-0'
        }
      `}>
        <Card className="h-full rounded-none md:rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-amber-200/50 dark:border-amber-200/30 shadow-lg">
          <CardContent className="p-4 pt-8 h-full">
          {/* Mobile Close Button */}
          <div className="md:hidden flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-amber-100">
              Filters
            </h2>
            <Button
              onClick={() => setIsMobileFiltersOpen(false)}
              variant="ghost"
              className="h-8 w-8 p-0"
            >
              ×
            </Button>
          </div>

          <h2 className="hidden md:block text-lg font-semibold text-slate-800 dark:text-amber-100 mb-6">
            Filters
          </h2>
          
          {/* Search Parameters Changed Warning */}
          {hasSearchParametersChanged && (
            <div className="mb-6 p-3 bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-300/30 rounded-lg">
              <div className="flex items-start space-x-2">
                <WarningTriangle className="h-4 w-4 text-amber-600 dark:text-amber-300 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                    Search parameters changed
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    You're viewing page {currentPage} of a different search. Generate from page 1 or reset to continue pagination.
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      onClick={resetToPaginatedSearch}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs bg-white/80 dark:bg-amber-950/20 border-amber-300/50 dark:border-amber-300/30 text-amber-700 dark:text-amber-300"
                    >
                                             <Refresh className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {/* Language Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-amber-200">Language</Label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="h-9 text-sm bg-white/80 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-200/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages?.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code} className="text-sm">
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Genre Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-amber-200">Genre *</Label>
              <Select value={selectedGenre} onValueChange={handleGenreChange}>
                <SelectTrigger className="h-9 text-sm bg-white/80 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-200/30">
                  <SelectValue placeholder="Select a genre" />
                </SelectTrigger>
                <SelectContent>
                  {genres?.map((genre) => (
                    <SelectItem key={genre.slug} value={genre.slug} className="text-sm">
                      {genre.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-amber-200">AI Model</Label>
              <Select 
                value={selectedModel?.toString() || ''} 
                onValueChange={(value) => setSelectedModel(parseInt(value))}
              >
                <SelectTrigger className="h-9 text-sm bg-white/80 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-200/30">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models?.map((model) => (
                    <SelectItem key={model.id} value={model.id.toString()} className="text-sm">
                      {model.model_domains?.label} - {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags Selection */}
            {selectedGenre && availableTags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-amber-200">
                  Tags (optional)
                </Label>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {availableTags.map((tag) => (
                    <Badge
                      key={tag.slug}
                      variant={selectedTags.includes(tag.slug) ? "default" : "outline"}
                      className={`cursor-pointer transition-colors text-xs px-2 py-1 ${
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

            {/* Generate Button */}
            <Button 
              onClick={() => {
                handleSearch()
                setIsMobileFiltersOpen(false) // Close mobile filters after search
              }}
              disabled={searchMutation.isPending || !selectedGenre || !selectedModel}
              className="w-full h-9 text-sm bg-amber-600 hover:bg-amber-700 text-white mt-6"
            >
              {searchMutation.isPending ? (
                <>
                  <Sparks className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
          </CardContent>
        </Card>
      </div>

            {/* Main Content Area */}
      <div className="flex-1 flex flex-col space-y-4">
        {/* Search Header Card */}
        <Card className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-amber-200/50 dark:border-amber-200/30 shadow-lg rounded-xl">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-amber-100 mb-2">
                Dive into infinity
              </h1>
              <p className="text-sm text-slate-600 dark:text-amber-50 leading-relaxed">
                Describe your ideal book and let it be found within the codex.
              </p>
            </div>

            {/* Main Search Input */}
            <div className="relative max-w-2xl mx-auto">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe your ideal book... (e.g., A mystery novel set in Victorian London)"
                className="h-12 text-base bg-white/80 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-200/30 pr-12"
              />
              <Button
                onClick={handleSearch}
                disabled={searchMutation.isPending || !selectedGenre || !selectedModel}
                className="absolute right-1 top-1 h-10 w-10 p-0 bg-amber-600 hover:bg-amber-700"
              >
                {searchMutation.isPending ? (
                  <Sparks className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card className="flex-1 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-amber-200/50 dark:border-amber-200/30 shadow-lg rounded-xl overflow-hidden">
          <CardContent className="p-0 h-full">
            <div className="h-full overflow-y-auto p-4">
          {searchMutation.isPending ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="relative mb-4">
                  <Sparks className="h-12 w-12 text-amber-600 dark:text-amber-300 animate-spin mx-auto" />
                  <div className="absolute inset-0 rounded-full border-2 border-amber-200/30 dark:border-amber-300/30 animate-pulse"></div>
                </div>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-amber-100 mb-2">
                  Weaving your query into existence...
                </h3>
                <div className="flex space-x-1 justify-center">
                  <div className="w-2 h-2 bg-amber-600 dark:bg-amber-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-amber-600 dark:bg-amber-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-amber-600 dark:bg-amber-300 rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          ) : searchMutation.data ? (
            <div className="space-y-4">
              {/* Results Header with Query Context */}
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-800 dark:text-amber-100">
                    Books (Page {currentPage})
                  </h2>
                  {searchMutation.data.cached && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-sm px-2 py-1">
                      Cached Result
                    </Badge>
                  )}
                </div>
                
                {/* Query Context - showing only the parameters that matter for pagination */}
                {paginatedSearchState && (
                  <div className="text-xs text-slate-500 dark:text-amber-200/70 space-y-1">
                    <div>
                      <span className="font-medium">Query:</span> {paginatedSearchState.freeText || 'No text query'}
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <span>
                        <span className="font-medium">Genre:</span> {genres?.find(g => g.slug === paginatedSearchState.genreSlug)?.label}
                      </span>
                      {paginatedSearchState.tagSlugs.length > 0 && (
                        <span>
                          <span className="font-medium">Tags:</span> {paginatedSearchState.tagSlugs.map(tagSlug => 
                            availableTags.find(t => t.slug === tagSlug)?.label
                          ).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Book Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {searchMutation.data.books.map((book) => (
                  <BookSearchResultCard key={book.id} book={book} />
                ))}
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-center space-x-4 pt-4">
                <Button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || searchMutation.isPending || hasSearchParametersChanged}
                  variant="outline"
                  className="h-9 px-4 text-sm bg-white/80 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-200/30"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center space-x-2">
                  <span className="text-slate-600 dark:text-amber-200 text-sm font-medium">
                    Page {currentPage}
                  </span>
                </div>

                <Button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={searchMutation.isPending || hasSearchParametersChanged}
                  variant="outline"
                  className="h-9 px-4 text-sm bg-white/80 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-200/30"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Book className="h-16 w-16 mx-auto mb-4 text-amber-400 dark:text-amber-300" />
                <p className="text-base text-slate-600 dark:text-amber-50">
                  Adjust your parameters and click Generate to find books.
                </p>
              </div>
            </div>
          )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 