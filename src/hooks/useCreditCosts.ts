import { useMemo } from 'react'
import { useModels } from '@/lib/queries'
import { DEFAULT_SEARCH_CREDITS, DEFAULT_PAGE_GENERATION_CREDITS } from '@/lib/credit-constants'

export function useSearchCreditCost(modelId: number | null) {
  const { data: models, isLoading, error } = useModels()
  
  const creditCost = useMemo(() => {
    if (!modelId || !models) return DEFAULT_SEARCH_CREDITS
    
    const model = models.find(m => m.id === modelId)
    return model?.search_credits ?? DEFAULT_SEARCH_CREDITS
  }, [models, modelId])

  return {
    data: creditCost,
    isLoading,
    error
  }
}

export function usePageGenerationCreditCost(modelId: number | null) {
  const { data: models, isLoading, error } = useModels()
  
  const creditCost = useMemo(() => {
    if (!modelId || !models) return DEFAULT_PAGE_GENERATION_CREDITS
    
    const model = models.find(m => m.id === modelId)
    return model?.page_generation_credits ?? DEFAULT_PAGE_GENERATION_CREDITS
  }, [models, modelId])

  return {
    data: creditCost,
    isLoading,
    error
  }
} 