'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useState } from 'react'
import { X } from 'lucide-react'

// Mock data - in real app this would come from the database
const mockLanguages = [
  { code: 'en', label: 'English' },
  { code: 'el', label: 'Greek' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
]

const mockGenres = [
  { slug: 'fantasy', label: 'Fantasy' },
  { slug: 'sci-fi', label: 'Science Fiction' },
  { slug: 'mystery', label: 'Mystery' },
  { slug: 'romance', label: 'Romance' },
  { slug: 'horror', label: 'Horror' },
  { slug: 'literary', label: 'Literary Fiction' },
]

const mockTags = [
  { slug: 'epic', label: 'Epic' },
  { slug: 'dark', label: 'Dark' },
  { slug: 'whimsical', label: 'Whimsical' },
  { slug: 'philosophical', label: 'Philosophical' },
  { slug: 'adventure', label: 'Adventure' },
  { slug: 'psychological', label: 'Psychological' },
  { slug: 'magical', label: 'Magical' },
  { slug: 'dystopian', label: 'Dystopian' },
]

export function BrowseFilters() {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const handleTagToggle = (tagSlug: string) => {
    setSelectedTags(prev => 
      prev.includes(tagSlug) 
        ? prev.filter(t => t !== tagSlug)
        : [...prev, tagSlug]
    )
  }

  const clearFilters = () => {
    setSelectedLanguage('all')
    setSelectedGenre('all')
    setSelectedTags([])
  }

  const hasActiveFilters = selectedLanguage !== 'all' || selectedGenre !== 'all' || selectedTags.length > 0

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters */}
          <div className="flex-1 space-y-4 lg:space-y-0 lg:flex lg:gap-4">
            {/* Language Filter */}
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                Language
              </label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="All languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All languages</SelectItem>
                  {mockLanguages.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Genre Filter */}
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                Genre
              </label>
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger>
                  <SelectValue placeholder="All genres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All genres</SelectItem>
                  {mockGenres.map(genre => (
                    <SelectItem key={genre.slug} value={genre.slug}>
                      {genre.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="mt-6">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-3">
            Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {mockTags.map(tag => {
              const isSelected = selectedTags.includes(tag.slug)
              return (
                <Badge
                  key={tag.slug}
                  variant={isSelected ? 'default' : 'outline'}
                  className={`cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-purple-600 hover:bg-purple-700' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => handleTagToggle(tag.slug)}
                >
                  {tag.label}
                  {isSelected && <X className="w-3 h-3 ml-1" />}
                </Badge>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 