'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, BookOpen, Languages, Cpu } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguages, useModels } from '@/lib/queries'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BookEdition } from '@/hooks/useBookData'
import { User } from '@supabase/supabase-js'

interface EditionManagerProps {
  bookId: string
  editions: BookEdition[]
  currentEdition: BookEdition | undefined
  onEditionChange: (editionId: string, isNewEdition?: boolean) => void
  user: User | null
}

export function EditionManager({ 
  bookId, 
  editions, 
  currentEdition, 
  onEditionChange, 
  user 
}: EditionManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedLanguageId, setSelectedLanguageId] = useState<string>('')
  const [selectedModelId, setSelectedModelId] = useState<string>('')

  const queryClient = useQueryClient()
  
  // Fetch available languages and models for creating new editions
  const { data: languages, isLoading: languagesLoading } = useLanguages()
  const { data: models, isLoading: modelsLoading } = useModels()

  // Mutation for creating new editions
  const createEditionMutation = useMutation({
    mutationFn: async ({ languageId, modelId }: { languageId: number; modelId: number }) => {
      const response = await fetch(`/api/book/${bookId}/editions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ languageId, modelId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create edition')
      }

      return response.json()
    },
    onSuccess: async (data) => {
      toast.success('New edition created successfully!')
      setIsDialogOpen(false)
      setSelectedLanguageId('')
      setSelectedModelId('')
      
      // Invalidate book data to refetch with new edition
      await queryClient.invalidateQueries({ queryKey: ['book', bookId] })
      
      // Switch to the new edition and indicate it's new
      onEditionChange(data.edition.id, true)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const handleCreateEdition = () => {
    if (!selectedLanguageId || !selectedModelId) {
      toast.error('Please select both language and model')
      return
    }

    createEditionMutation.mutate({
      languageId: parseInt(selectedLanguageId),
      modelId: parseInt(selectedModelId)
    })
  }

  // Check if a language+model combination already exists
  const isComboExists = (languageId: string, modelId: string) => {
    return editions.some(edition => 
      edition.languageId.toString() === languageId && 
      edition.modelId.toString() === modelId
    )
  }

  const availableModels = models?.filter(model => {
    if (!selectedLanguageId) return true
    return !isComboExists(selectedLanguageId, model.id.toString())
  }) || []

  const availableLanguages = languages?.filter(language => {
    if (!selectedModelId) return true
    return !isComboExists(language.id.toString(), selectedModelId)
  }) || []

  return (
    <div className="space-y-3">
      {/* Edition Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-4 w-4 text-mirage-text-muted" />
          <span className="text-sm font-medium text-mirage-text-primary">Edition</span>
        </div>
        {editions.length > 1 && (
          <Badge variant="secondary" className="text-xs">
            {editions.length} available
          </Badge>
        )}
      </div>

      {/* Edition Selector */}
      <div>
        <Select key={currentEdition?.id} value={currentEdition?.id || ''} onValueChange={onEditionChange}>
          <SelectTrigger className="w-full h-9 text-sm bg-white/90 border-mirage-border-primary">
            <SelectValue>
              <div className="flex flex-col items-start">
                <div className="flex items-center space-x-2">
                  <Languages className="h-3 w-3 text-mirage-text-muted" />
                  <span className="font-medium">{currentEdition?.language || 'Unknown Language'}</span>
                </div>
                <div className="flex items-center space-x-2 mt-0.5">
                  <Cpu className="h-3 w-3 text-mirage-text-muted" />
                  <span className="text-xs text-mirage-text-secondary">{currentEdition?.modelName || 'Unknown Model'}</span>
                </div>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {editions.map((edition) => (
              <SelectItem key={edition.id} value={edition.id}>
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <Languages className="h-3 w-3 text-mirage-text-muted" />
                    <span className="font-medium">{edition.language}</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <Cpu className="h-3 w-3 text-mirage-text-muted" />
                    <span className="text-xs text-muted-foreground">{edition.modelName}</span>
                  </div>
                </div>
              </SelectItem>
            ))}
            
            {/* Add New Edition Option */}
            {user && (
              <div className="border-t border-gray-200 mt-1 pt-1">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <div className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 cursor-pointer rounded-sm">
                      <Plus className="h-3 w-3 text-mirage-text-muted" />
                      <span className="text-sm font-medium text-mirage-text-primary">Add New Edition</span>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-white/95 backdrop-blur-md border border-mirage-border-primary shadow-xl">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-semibold text-mirage-text-primary">
                        Create New Edition
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="language-select" className="text-sm font-medium text-mirage-text-primary">
                          Language
                        </Label>
                        <Select value={selectedLanguageId} onValueChange={setSelectedLanguageId}>
                          <SelectTrigger className="w-full bg-white/90 border-mirage-border-primary">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            {languagesLoading ? (
                              <SelectItem value="loading" disabled>Loading languages...</SelectItem>
                            ) : (
                              availableLanguages.map((language) => (
                                <SelectItem key={language.id} value={language.id.toString()}>
                                  {language.label}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="model-select" className="text-sm font-medium text-mirage-text-primary">
                          Model
                        </Label>
                        <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                          <SelectTrigger className="w-full bg-white/90 border-mirage-border-primary">
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                          <SelectContent>
                            {modelsLoading ? (
                              <SelectItem value="loading" disabled>Loading models...</SelectItem>
                            ) : (
                              availableModels.map((model) => (
                                <SelectItem key={model.id} value={model.id.toString()}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{model.model_domains?.label} - {model.name}</span>
                                    {model.page_generation_credits && (
                                      <span className="text-xs text-muted-foreground">
                                        {model.page_generation_credits} credits per page
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedLanguageId && selectedModelId && isComboExists(selectedLanguageId, selectedModelId) && (
                        <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                          This language and model combination already exists for this book.
                        </div>
                      )}

                      <div className="flex space-x-2 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateEdition}
                          disabled={
                            !selectedLanguageId || 
                            !selectedModelId || 
                            isComboExists(selectedLanguageId, selectedModelId) ||
                            createEditionMutation.isPending
                          }
                          className="flex-1"
                          style={{
                            backgroundColor: 'rgb(217 119 6)',
                            borderColor: 'rgb(217 119 6)',
                            color: 'white'
                          }}
                        >
                          {createEditionMutation.isPending ? 'Creating...' : 'Create Edition'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
} 