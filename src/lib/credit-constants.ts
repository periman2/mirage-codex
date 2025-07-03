import { createSupabaseServerClient } from './supabase'

// Plan limits and features
export const PLAN_FEATURES = {
  FREE: {
    MONTHLY_CREDITS: 50,
    SEARCH_LIMIT: 10, // Maximum searches per month
    PAGE_GENERATION_LIMIT: 16, // Maximum pages that can be generated per month
  },
  STANDARD: {
    MONTHLY_CREDITS: 500,
    SEARCH_LIMIT: 100, // Maximum searches per month  
    PAGE_GENERATION_LIMIT: 166, // Maximum pages that can be generated per month
  },
} as const

// Fallback credit costs if model doesn't have specific values
export const DEFAULT_SEARCH_CREDITS = 5
export const DEFAULT_PAGE_GENERATION_CREDITS = 3

/**
 * Get the search credit cost for a specific model
 */
export async function getSearchCreditCost(modelId: number): Promise<number> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data: model, error } = await supabase
      .from('models')
      .select('search_credits')
      .eq('id', modelId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    
    if (error || !model) {
      console.warn(`Failed to fetch search credits for model ${modelId}, using default:`, error)
      return DEFAULT_SEARCH_CREDITS
    }
    
    return model.search_credits ?? DEFAULT_SEARCH_CREDITS
  } catch (error) {
    console.warn(`Error fetching search credits for model ${modelId}, using default:`, error)
    return DEFAULT_SEARCH_CREDITS
  }
}

/**
 * Get the page generation credit cost for a specific model
 */
export async function getPageGenerationCreditCost(modelId: number): Promise<number> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data: model, error } = await supabase
      .from('models')
      .select('page_generation_credits')
      .eq('id', modelId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    
    if (error || !model) {
      console.warn(`Failed to fetch page generation credits for model ${modelId}, using default:`, error)
      return DEFAULT_PAGE_GENERATION_CREDITS
    }
    
    return model.page_generation_credits ?? DEFAULT_PAGE_GENERATION_CREDITS
  } catch (error) {
    console.warn(`Error fetching page generation credits for model ${modelId}, using default:`, error)
    return DEFAULT_PAGE_GENERATION_CREDITS
  }
}

/**
 * Get all credit costs for a model at once
 */
export async function getModelCreditCosts(modelId: number): Promise<{
  searchCredits: number
  pageGenerationCredits: number
}> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data: model, error } = await supabase
      .from('models')
      .select('search_credits, page_generation_credits')
      .eq('id', modelId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    
    if (error || !model) {
      console.warn(`Failed to fetch credit costs for model ${modelId}, using defaults:`, error)
      return {
        searchCredits: DEFAULT_SEARCH_CREDITS,
        pageGenerationCredits: DEFAULT_PAGE_GENERATION_CREDITS
      }
    }
    
    return {
      searchCredits: model.search_credits ?? DEFAULT_SEARCH_CREDITS,
      pageGenerationCredits: model.page_generation_credits ?? DEFAULT_PAGE_GENERATION_CREDITS
    }
  } catch (error) {
    console.warn(`Error fetching credit costs for model ${modelId}, using defaults:`, error)
    return {
      searchCredits: DEFAULT_SEARCH_CREDITS,
      pageGenerationCredits: DEFAULT_PAGE_GENERATION_CREDITS
    }
  }
}

/**
 * Helper function to check if user can afford a model-based operation
 */
export function canAffordModelOperation(credits: number, operationCost: number): boolean {
  return credits >= operationCost
}

/**
 * Helper function to calculate operations remaining for a model-based operation
 */
export function getModelOperationsRemaining(credits: number, operationCost: number): number {
  return Math.floor(credits / operationCost)
} 