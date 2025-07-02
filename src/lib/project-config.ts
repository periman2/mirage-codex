import { createSupabaseServerClient } from './supabase'

// Type definitions for project configuration
export interface FeatureFlags {
  book_page_images: boolean
}

export interface PageGenerationConfig {
  context_pages_count: number
  default_temperature: number
  max_duration: number
}

export interface AISettings {
  default_tokens_per_page: number
  temperature_range: {
    min: number
    max: number
  }
  existing_authors_probability: number
}

export interface AppSettings {
  maintenance_mode: boolean
  max_pages_per_book: number
  default_page_cache_ttl: number
}

export interface ProjectConfig {
  feature_flags: FeatureFlags
  page_generation: PageGenerationConfig
  ai_settings: AISettings
  app_settings: AppSettings
}

/**
 * Get a specific project configuration value by key
 */
export async function getProjectConfig<K extends keyof ProjectConfig>(
  key: K
): Promise<ProjectConfig[K] | null> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data, error } = await supabase.rpc('get_project_config', {
      p_key: key
    })

    if (error) {
      console.error(`Error fetching project config for key ${key}:`, error)
      return null
    }

    return data as unknown as ProjectConfig[K]
  } catch (error) {
    console.error(`Failed to get project config for key ${key}:`, error)
    return null
  }
}

/**
 * Get all project configuration values at once
 */
export async function getAllProjectConfig(): Promise<Partial<ProjectConfig>> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data, error } = await supabase.rpc('get_all_project_config')

    if (error) {
      console.error('Error fetching all project config:', error)
      return {}
    }

    // Convert array of key-value pairs to object
    const config: Partial<ProjectConfig> = {}
    if (data) {
      for (const item of data) {
        ;(config as any)[item.key] = item.value
      }
    }

    return config
  } catch (error) {
    console.error('Failed to get all project config:', error)
    return {}
  }
}

/**
 * Check if a feature flag is enabled
 */
export async function isFeatureEnabled(flagName: keyof FeatureFlags): Promise<boolean> {
  try {
    const featureFlags = await getProjectConfig('feature_flags')
    return featureFlags?.[flagName] ?? false
  } catch (error) {
    console.error(`Failed to check feature flag ${flagName}:`, error)
    return false
  }
}

/**
 * Get page generation configuration with fallbacks
 */
export async function getPageGenerationConfig(): Promise<PageGenerationConfig> {
  const config = await getProjectConfig('page_generation')
  
  // Provide fallbacks if config is not available
  return {
    context_pages_count: config?.context_pages_count ?? 50,
    default_temperature: config?.default_temperature ?? 0.8,
    max_duration: config?.max_duration ?? 60
  }
}

/**
 * Get AI settings with fallbacks
 */
export async function getAISettings(): Promise<AISettings> {
  const config = await getProjectConfig('ai_settings')
  
  return {
    default_tokens_per_page: config?.default_tokens_per_page ?? 500,
    temperature_range: {
      min: config?.temperature_range?.min ?? 0.1,
      max: config?.temperature_range?.max ?? 1.0
    },
    existing_authors_probability: config?.existing_authors_probability ?? 0.5
  }
}

/**
 * Get app settings with fallbacks
 */
export async function getAppSettings(): Promise<AppSettings> {
  const config = await getProjectConfig('app_settings')
  
  return {
    maintenance_mode: config?.maintenance_mode ?? false,
    max_pages_per_book: config?.max_pages_per_book ?? 200,
    default_page_cache_ttl: config?.default_page_cache_ttl ?? 3600
  }
}

/**
 * Set a project configuration value (admin function)
 */
export async function setProjectConfig<K extends keyof ProjectConfig>(
  key: K,
  value: ProjectConfig[K]
): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data, error } = await supabase.rpc('set_project_config', {
      p_key: key,
      p_value: value as any
    })

    if (error) {
      console.error(`Error setting project config for key ${key}:`, error)
      return false
    }

    return data === true
  } catch (error) {
    console.error(`Failed to set project config for key ${key}:`, error)
    return false
  }
}