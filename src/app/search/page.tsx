'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useLanguages, useGenres, useTagsByGenre, useModels } from '@/lib/queries'
import { useMutation } from '@tanstack/react-query'
import { useCredits } from '@/hooks/useCredits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { BookSearchResultCard } from '@/components/book-search-result-card'
import { AuthButton } from '@/components/auth-button'
import { Search, Book, ArrowLeft, ArrowRight, Filter, WarningTriangle, Refresh } from 'iconoir-react'
import { CreditsIcon } from '@/components/ui/credits-icon'
import { toast } from 'sonner'

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

interface SearchResult {
  searchId: string
  books: SearchResultBook[]
  cached: boolean
}

interface SearchRequest {
  freeText?: string
  languageCode?: string
  genreSlug?: string
  tagSlugs: string[]
  modelId: number
  pageNumber: number
}

// Model type as returned by useModels()
type ModelWithCredits = {
  id: number
  name: string
  domain_code: string
  context_len: number
  prompt_cost: number
  completion_cost: number
  search_credits: number | null
  page_generation_credits: number | null
  is_active: boolean | null
  model_domains: { label: string } | null
}

// Type for tracking the current paginated search parameters
interface PaginatedSearchState {
  freeText: string
  genreSlug: string // Keep as string, use empty string for auto-detected genre
  tagSlugs: string[]
  model: ModelWithCredits
}

function SearchPageContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: languages } = useLanguages()
  const { data: genres } = useGenres()
  const { data: models } = useModels()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('auto')
  const [selectedGenre, setSelectedGenre] = useState('auto')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<ModelWithCredits | null>(null)
  
  // Credits hook for invalidation
  const { invalidateCredits } = useCredits()
  const [currentPage, setCurrentPage] = useState(1)
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Track the search parameters that correspond to the current paginated results
  const [paginatedSearchState, setPaginatedSearchState] = useState<PaginatedSearchState | null>(null)

  // Set default model to gemini-2.5-flash-lite when models are loaded
  const defaultModel = useMemo(() => {
    return models?.find(m => m.name.toLowerCase().includes('lite')) || null
  }, [models])

  // Set default model when it becomes available
  useMemo(() => {
    if (defaultModel && selectedModel === null) {
      setSelectedModel(defaultModel)
    }
  }, [defaultModel, selectedModel])

  // Remove default genre selection - user must choose or we'll use AI to determine

  // Parse URL parameters on component mount and when search params change
  useEffect(() => {
    if (!genres || !models || !languages || !searchParams || !isInitialLoad || !defaultModel) return

    const urlQuery = searchParams.get('q') || ''
    const urlGenre = searchParams.get('genre') || ''
    const urlLanguage = searchParams.get('language') || ''
    const urlTags = searchParams.get('tags') ? searchParams.get('tags')!.split(',').filter(Boolean) : []
    const urlPage = parseInt(searchParams.get('page') || '1')

    // Validate genre exists (but don't require it)
    const validGenre = urlGenre ? genres.find(g => g.slug === urlGenre) : null
    // Validate language exists (but don't require it)
    const validLanguage = urlLanguage ? languages.find(l => l.code === urlLanguage) : null

    // Find the default model directly from models array
    const modelToUse = defaultModel

    if (urlQuery || urlGenre || urlLanguage || urlTags.length > 0 || urlPage > 1) {
      // Set state from URL
      setSearchQuery(urlQuery)
      setSelectedGenre(validGenre ? urlGenre : 'auto') // Use "auto" when no valid genre from URL
      setSelectedLanguage(validLanguage ? urlLanguage : 'auto') // Use "auto" when no valid language from URL
      setSelectedTags(urlTags)
      setCurrentPage(urlPage)

      // Set the selected model too
      if (modelToUse) {
        setSelectedModel(modelToUse)
      }

      // If we have valid search parameters and a model, trigger the search
      // Now we can search with just query text even without genre or language
      if ((validGenre || urlQuery.trim()) && modelToUse) {
        searchMutation.mutate({
          freeText: urlQuery || undefined,
          languageCode: validLanguage ? urlLanguage : undefined, // Only send language if valid
          genreSlug: validGenre ? urlGenre : undefined, // Only send genre if valid (converts 'auto' to undefined)
          tagSlugs: urlTags,
          modelId: modelToUse.id,
          pageNumber: urlPage,
        })
      }
    }

    setIsInitialLoad(false)
  }, [genres, models, languages, searchParams, isInitialLoad, defaultModel])

  // Function to update URL with search parameters
  const updateURL = (params: {
    query?: string
    genre: string
    language?: string
    tags: string[]
    page: number
  }) => {
    const urlParams = new URLSearchParams()

    if (params.query && params.query.trim()) {
      urlParams.set('q', params.query.trim())
    }
    if (params.genre) {
      urlParams.set('genre', params.genre)
    }
    if (params.language) {
      urlParams.set('language', params.language)
    }
    if (params.tags.length > 0) {
      urlParams.set('tags', params.tags.join(','))
    }
    if (params.page > 1) {
      urlParams.set('page', params.page.toString())
    }

    const newURL = `/search${urlParams.toString() ? '?' + urlParams.toString() : ''}`
    router.push(newURL, { scroll: false })
  }

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

    // Normalize genre values for comparison ('auto' in UI maps to '' in paginated state)
    const normalizedSelectedGenre = selectedGenre === 'auto' ? '' : selectedGenre
    const normalizedPaginatedGenre = paginatedSearchState.genreSlug

    return (
      searchQuery.trim() !== paginatedSearchState.freeText ||
      normalizedSelectedGenre !== normalizedPaginatedGenre ||
      JSON.stringify([...selectedTags].sort()) !== JSON.stringify([...paginatedSearchState.tagSlugs].sort()) ||
      selectedModel?.id !== paginatedSearchState.model?.id
    )
  }, [searchQuery, selectedGenre, selectedTags, selectedModel, paginatedSearchState, currentPage])

  // Reset to paginated search state
  const resetToPaginatedSearch = () => {
    if (!paginatedSearchState) return

    setSearchQuery(paginatedSearchState.freeText)
    setSelectedGenre(paginatedSearchState.genreSlug || 'auto') // Convert empty string back to 'auto' for UI
    setSelectedTags([...paginatedSearchState.tagSlugs])
    setSelectedModel(paginatedSearchState.model)
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

    // Update URL with new page
    if (paginatedSearchState) {
      updateURL({
        query: paginatedSearchState.freeText,
        genre: paginatedSearchState.genreSlug,
        language: selectedLanguage === 'auto' ? '' : selectedLanguage, // Include current language selection, convert auto to empty
        tags: paginatedSearchState.tagSlugs,
        page: newPage
      })

                // Trigger new search with the new page
      searchMutation.mutate({
        freeText: paginatedSearchState.freeText || undefined,
        languageCode: selectedLanguage === 'auto' ? undefined : selectedLanguage || undefined, // Convert "auto" to undefined
        genreSlug: paginatedSearchState.genreSlug || undefined, // Convert empty string to undefined
        tagSlugs: paginatedSearchState.tagSlugs,
        modelId: paginatedSearchState.model.id,
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
        throw new Error(error.error || 'Failed to search for books')
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      // Update paginated search state when search succeeds
      setPaginatedSearchState({
        freeText: variables.freeText || '',
        genreSlug: variables.genreSlug || '', // Store empty string instead of 'auto' to preserve API format
        tagSlugs: [...variables.tagSlugs],
        model: selectedModel!
      })



      if (data.cached) {
        toast.success(`Found cached results for page ${variables.pageNumber} - no credits used!`)
      } else {
        // Invalidate credits cache since credits were consumed
        invalidateCredits()
        toast.success(`Searched for ${data.books.length} new books for page ${variables.pageNumber}!`)
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to search for books')
    },
  })

  const handleSearch = () => {
    // Updated validation logic: require text query if both language and genre are auto-detect
    // Otherwise allow any combination
    if (!searchQuery.trim() && selectedGenre === 'auto' && selectedLanguage === 'auto') {
      toast.error('Please enter a search query, or select a language/genre')
      return
    }

    if (!selectedModel) {
      toast.error('Please select a model')
      return
    }

    // Reset to page 1 for new searches
    setCurrentPage(1)

    // Update URL with search parameters
    updateURL({
      query: searchQuery,
      genre: selectedGenre === 'auto' ? '' : selectedGenre,
      language: selectedLanguage === 'auto' ? '' : selectedLanguage,
      tags: selectedTags,
      page: 1
    })

    searchMutation.mutate({
      freeText: searchQuery.trim() || undefined,
      languageCode: selectedLanguage === 'auto' ? undefined : selectedLanguage || undefined, // Convert "auto" to undefined
      genreSlug: selectedGenre === 'auto' ? undefined : selectedGenre || undefined, // Convert "auto" to undefined
      tagSlugs: selectedTags,
      modelId: selectedModel?.id || 0,
      pageNumber: 1, // Always start from page 1 for new searches
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !searchMutation.isPending && selectedModel && (searchQuery.trim() || selectedGenre !== 'auto' || selectedLanguage !== 'auto')) {
      handleSearch()
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-mirage-bg-secondary/20 backdrop-blur-sm rounded-3xl p-8 border border-mirage-border-primary/30">
            <Book className="h-16 w-16 mx-auto mb-4 text-mirage-accent-primary" />
            <h1 className="text-2xl font-bold text-mirage-text-primary mb-4">
              Authentication Required
            </h1>
            <p className="text-mirage-text-tertiary mb-6">
              Please sign in to access the Search feature.
            </p>
            <AuthButton
              onSignInSuccess={() => window.location.reload()}
              className="bg-mirage-accent-primary hover:bg-mirage-accent-hover text-white"
            >
              Sign In
            </AuthButton>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="flex h-[calc(100vh-4rem)] relative bg-mirage-gradient p-4 gap-4"
      style={{
        backgroundImage: `url('https://nxdsudkpprqhmvesftzp.supabase.co/storage/v1/object/public/app/background/marble_texture.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundBlendMode: 'overlay'
      }}
    >
      {/* Marble texture overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url('https://nxdsudkpprqhmvesftzp.supabase.co/storage/v1/object/public/app/background/marble_texture.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.24
        }}
      />
            {/* Mobile Filter Button */}
      <Button
        onClick={() => setIsMobileFiltersOpen(true)}
        className="md:hidden fixed top-24 left-4 z-40 h-10 w-10 p-0 rounded-full shadow-lg"
        style={{
          backgroundColor: 'rgb(217 119 6)',
          borderColor: 'rgb(217 119 6)',
          color: 'white'
        }}
      >
        <Filter className="h-5 w-5" style={{ color: 'white' }} />
      </Button>

      {/* Mobile Overlay */}
      {isMobileFiltersOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsMobileFiltersOpen(false)} />
      )}

      {/* Left Sidebar - Filters */}
      <div className={`
        w-72 flex-shrink-0 overflow-y-auto overflow-x-hidden
        md:relative md:block md:translate-x-0
        ${isMobileFiltersOpen
          ? 'fixed inset-y-0 left-0 z-50 translate-x-0 transition-transform duration-300 ease-out md:transition-none'
          : 'fixed inset-y-0 left-0 -translate-x-full transition-transform duration-300 ease-out md:transition-none md:translate-x-0'
        }
      `}>
        <Card className="h-full rounded-none md:rounded-xl bg-white/95 backdrop-blur-md border border-mirage-border-primary shadow-xl">
          <CardContent className="p-4 pt-8 h-full">
            {/* Mobile Close Button */}
            <div className="md:hidden flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-mirage-text-primary">
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

            <h2 className="hidden md:block text-lg font-semibold text-mirage-text-primary mb-6">
              Filters
            </h2>

            {/* Search Parameters Changed Warning */}
            {hasSearchParametersChanged && (
              <div className="mb-6 p-3 bg-mirage-bg-tertiary/80 border border-mirage-border-primary/50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <WarningTriangle className="h-4 w-4 text-mirage-accent-primary mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="text-xs text-mirage-text-secondary font-medium">
                      Search parameters changed
                    </p>
                    <p className="text-xs text-mirage-text-tertiary">
                      You're viewing page {currentPage} of a different search. Search again from page 1 or reset to continue pagination.
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        onClick={resetToPaginatedSearch}
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs bg-white/90 border-mirage-border-primary text-mirage-text-tertiary"
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
                <Label className="text-sm font-medium text-mirage-text-secondary">Language</Label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="h-9 text-sm bg-white/90 border-mirage-border-primary !w-full min-w-0">
                    <SelectValue placeholder="Auto-detect from AI" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto" className="text-sm font-medium text-mirage-accent-primary">
                      Auto-detect from AI
                    </SelectItem>
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
                <Label className="text-sm font-medium text-mirage-text-secondary">Genre</Label>
                <Select value={selectedGenre} onValueChange={handleGenreChange}>
                  <SelectTrigger className="h-9 text-sm bg-white/90 border-mirage-border-primary !w-full min-w-0">
                    <SelectValue placeholder="Auto-detect from AI" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto" className="text-sm font-medium text-mirage-accent-primary">
                      Auto-detect from AI
                    </SelectItem>
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
                <Label className="text-sm font-medium text-mirage-text-secondary">AI Model</Label>
                <Select
                  value={selectedModel?.id.toString() || ''}
                  onValueChange={(value) => {
                    const model = models?.find(m => m.id === parseInt(value))
                    setSelectedModel(model || null)
                  }}
                >
                  <SelectTrigger className="h-9 text-sm bg-white/90 border-mirage-border-primary !w-full min-w-0">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent className="max-w-80">
                    {models?.map((model) => (
                      <SelectItem key={model.id} value={model.id.toString()} className="text-sm max-w-80">
                        <span className="truncate">
                          {model.model_domains?.label} - {model.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

                          {/* Tags Selection */}
            {selectedGenre && availableTags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-mirage-text-secondary">
                  Tags (optional)
                </Label>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {availableTags.map((tag) => (
                    <Badge
                      key={tag.slug}
                      variant={selectedTags.includes(tag.slug) ? "default" : "outline"}
                      className={`cursor-pointer transition-colors text-xs px-2 py-1 ${selectedTags.includes(tag.slug)
                          ? ""
                          : "bg-white/90 text-mirage-text-tertiary hover:bg-white border border-mirage-border-primary"
                        }`}
                      style={selectedTags.includes(tag.slug) ? {
                        backgroundColor: 'rgb(217 119 6)',
                        borderColor: 'rgb(217 119 6)',
                        color: 'white'
                      } : {}}
                      onClick={() => handleTagToggle(tag.slug)}
                    >
                      {tag.label}
                    </Badge>
                  ))}
                </div>
              </div>
                          )}

            <Button 
              onClick={() => {
                handleSearch()
                setIsMobileFiltersOpen(false) // Close mobile filters after search
              }}
              disabled={searchMutation.isPending || (!searchQuery.trim() && selectedGenre === 'auto' && selectedLanguage === 'auto') || !selectedModel}
              className="w-full h-10 text-sm font-medium mt-6 shadow-lg border-2"
              style={{
                backgroundColor: 'rgb(217 119 6)',
                borderColor: 'rgb(217 119 6)',
                color: 'white'
              }}
            >
              {searchMutation.isPending ? (
                <>
                  <CreditsIcon className="h-4 w-4 mr-2 animate-spin" style={{ color: 'white' }} />
                  <span style={{ color: 'white' }}>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" style={{ color: 'white' }} />
                  <span style={{ color: 'white' }}>
                    Search Books
                    {selectedModel?.search_credits && (
                                              <span className="ml-1">
                        (<CreditsIcon className="h-3 w-3 inline mx-1" />{selectedModel.search_credits})
                      </span>
                    )}
                  </span>
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
        <Card className="bg-white/95 backdrop-blur-md border border-mirage-border-primary shadow-xl rounded-xl">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <h1 className="text-2xl md:text-3xl font-bold text-mirage-text-primary mb-2">
                Dive into infinity
              </h1>
            </div>

            {/* Main Search Input */}
            <div className="relative max-w-2xl mx-auto">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe your ideal book... (e.g., A mystery novel set in Victorian London)"
                className="h-12 text-base bg-white/90 border-mirage-border-primary pr-12"
                maxLength={10000}
              />
              <Button
                onClick={handleSearch}
                disabled={searchMutation.isPending || (!searchQuery.trim() && selectedGenre === 'auto' && selectedLanguage === 'auto') || !selectedModel}
                className="absolute right-1 top-1 h-10 w-10 p-0 shadow-lg border-2 rounded-lg z-10"
                style={{
                  backgroundColor: 'rgb(217 119 6)',
                  borderColor: 'rgb(217 119 6)',
                  color: 'white'
                }}
                title={selectedModel?.search_credits ? `Search (${selectedModel.search_credits} credits)` : 'Search'}
              >
                {searchMutation.isPending ? (
                  <CreditsIcon className="h-4 w-4 animate-spin" style={{ color: 'white' }} />
                ) : (
                  <Search className="h-4 w-4" style={{ color: 'white' }} />
                )}
              </Button>

              {/* Character Count */}
              <div className="flex justify-end mt-1">
                <span className={`text-xs transition-colors ${searchQuery.length > 9500
                    ? 'text-red-500'
                    : searchQuery.length > 8000
                      ? 'text-mirage-accent-primary'
                      : 'text-mirage-text-muted'
                  }`}>
                  {searchQuery.length}/10000
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card className="flex-1 bg-white/95 backdrop-blur-md border border-mirage-border-primary shadow-xl rounded-xl overflow-hidden">
          <CardContent className="p-0 h-full">
            <div className="h-full overflow-y-auto p-4">
              {searchMutation.isPending ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="relative mb-4">
                      <CreditsIcon className="h-12 w-12 text-mirage-accent-primary animate-spin mx-auto" />
                      <div className="absolute inset-0 rounded-full border-2 border-mirage-border-primary/30 animate-pulse"></div>
                    </div>
                    <h3 className="text-xl font-semibold text-mirage-text-primary mb-2">
                      Weaving your query into existence...
                    </h3>
                  </div>
                </div>
              ) : searchMutation.data ? (
                <div className="space-y-4">
                  {/* Results Header with Query Context */}
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-mirage-text-primary">
                        Books (Page {currentPage})
                      </h2>
                      <div className="flex items-center space-x-2">
                        {searchMutation.data.cached && (
                          <Badge className="bg-green-100 text-green-800 text-sm px-2 py-1">
                            Cached Result
                          </Badge>
                        )}
                        <Button
                          onClick={() => {
                            const currentURL = window.location.href
                            navigator.clipboard.writeText(currentURL)
                            toast.success('Search URL copied to clipboard!')
                          }}
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs bg-white/90 border-mirage-border-primary"
                        >
                          Share Search
                        </Button>
                      </div>
                    </div>

                    {/* Query Context - showing only the parameters that matter for pagination */}
                    {paginatedSearchState && (
                      <div className="text-xs text-mirage-text-muted space-y-1">
                        <div>
                          <span className="font-medium">Query:</span> {paginatedSearchState.freeText || 'No text query'}
                        </div>
                        <div className="flex flex-wrap gap-4">
                          <span>
                            <span className="font-medium">Genre:</span> {paginatedSearchState.genreSlug ? genres?.find(g => g.slug === paginatedSearchState.genreSlug)?.label : 'Auto-detected'}
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
                      className="h-9 px-4 text-sm bg-white/90 border-mirage-border-primary"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>

                    <div className="flex items-center space-x-2">
                      <span className="text-mirage-text-tertiary text-sm font-medium">
                        Page {currentPage}
                      </span>
                    </div>

                    <Button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={searchMutation.isPending || hasSearchParametersChanged}
                      variant="outline"
                      className="h-9 px-4 text-sm bg-white/90 border-mirage-border-primary"
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Book className="h-16 w-16 mx-auto mb-4 text-mirage-text-light" />
                    <p className="text-base text-mirage-text-tertiary">
                      Adjust your parameters and click Search to find books.
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

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-mirage-gradient">
        <div className="text-center">
          <CreditsIcon className="h-12 w-12 text-mirage-accent-primary animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-mirage-text-primary mb-2">
            Loading search page...
          </h3>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  )
} 