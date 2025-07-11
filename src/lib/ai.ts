import { generateObject, generateText, streamText } from 'ai'
import { createOpenAI, openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google, GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { z } from 'zod'

const openaiModel = createOpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

/**
 * Get provider-specific options for AI SDK calls
 * Centralizes all provider configurations for consistency across the app
 */
export function getProviderOptions(domain: string) {
  switch (domain) {
    case 'google':
      return {
        google: {
          thinkingConfig: {
            thinkingBudget: 1048,
            includeThoughts: false
          },
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    case 'openai':
      // Return undefined when no specific options are needed
      return undefined
    case 'anthropic':
      // Return undefined when no specific options are needed
      return undefined
    default:
      return undefined
  }
}

// Constants
export const PAGE_SIZE = 3 // Number of books generated per search

/**
 * Create a model configuration dynamically based on domain and model name
 */
function createModel(domain: string, modelName: string) {
  switch (domain) {
    case 'openai':
      return openaiModel(modelName)
    case 'anthropic':
      return anthropic(modelName)
    case 'google':
      return google(modelName)
    default:
      throw new Error(`Unsupported model domain: ${domain}`)
  }
}

/**
 * Get AI provider for a given domain and model name (exported alias)
 */
export async function getAIProvider(domain: string, modelName: string) {
  return createModel(domain, modelName)
}

// Schemas for structured generation
export const AuthorSchema = z.object({
  penName: z.string().describe('The author\'s pen name'),
  stylePrompt: z.string().describe('A brief description of the author\'s writing style'),
  bio: z.string().describe('A fictional biography of the author (2-3 sentences)'),
})

export const AuthorListSchema = z.object({
  authors: z.array(AuthorSchema).describe('A list of fictional authors for the specified genre'),
})

// Schema for genre and language determination
export const GenreLanguageDeterminationSchema = z.object({
  genreSlug: z.string().describe('The most appropriate genre slug for the user query'),
  languageCode: z.string().describe('The detected language code for the user query'),
  reasoning: z.string().describe('Brief explanation of why this genre and language were chosen'),
})

export const SectionSchema = z.object({
  title: z.string().describe('The section title (e.g., "Chapter 1", "Recipe 1: Roasted Tofu", "Introduction", "References")'),
  fromPage: z.number().min(1).describe('Starting page number for this section'),
  toPage: z.number().min(1).describe('Ending page number for this section'),
  summary: z.string().describe('1-2 sentence summary of what happens in this section'),
})

export const BookSchema = z.object({
  title: z.string().describe('The book title'),
  summary: z.string().describe('A compelling book summary (2-3 sentences)'),
  pageCount: z.number().describe('Realistic page count for this type of book'),
  bookCoverPrompt: z.string().describe('A single sentence visual description of what the book cover should look like, including style, colors, imagery, and mood'),
  sections: z.array(SectionSchema).describe('Book sections with page ranges and summaries'),
})

export const BookListSchema = z.object({
  books: z.array(BookSchema).length(PAGE_SIZE).describe(`A list of exactly ${PAGE_SIZE} fictional books matching the search criteria`),
})

export const PageContentSchema = z.object({
  content: z.string().describe('The full text content of this book page'),
})

/**
 * Generate fictional authors for a specific genre with retry logic
 */
export async function generateAuthors(params: {
  genrePrompt: string
  languageCode: string
  modelName: string
  modelDomain: string
  freeText?: string
  count: number
}): Promise<Array<z.infer<typeof AuthorSchema>>> {
  console.log('generateAuthors called with count:', params.count, 'for genre:', params.genrePrompt)

  const model = createModel(params.modelDomain, params.modelName)

  const systemPrompt = `You are a curator of fictional authors who write in specific genres. Generate completely original, fictional authors that never existed.

GENRE CONTEXT: ${params.genrePrompt}
LANGUAGE: Generate names and content in language code "${params.languageCode}"

REQUIREMENTS:
- Create diverse, unique authors with distinct writing styles
- Make pen names memorable and appropriate for the genre
- Write compelling biographies that establish their fictional literary careers
- Vary writing styles to create interesting diversity
- Authors should feel like they belong in this genre but have unique voices
- Make them feel real and established in the literary world

${params.freeText ? `THIS IS THE USER'S QUERY FOR SEARCHING THE LIBRARY, FOLLOW IT CAREFULLY WHEN CRAFTING THE AUTHORS, ANY INSTRUCTIONS RELATED TO THE AUTHORS THAT MIGHT EXIST HERE ARE MORE IMPORTANT THAN YOUR PREVIOUS INSTRUCTIONS: "${params.freeText}"` : ''}

CREATIVITY: Be highly creative and unexpected in your author creations. Think of authors who might exist in parallel literary universes.`

  const dynamicSchema = z.object({
    authors: z.array(AuthorSchema).length(params.count).describe(`Exactly ${params.count} fictional authors for the specified genre`),
  })

  // Retry logic - up to 3 attempts
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Author generation attempt ${attempt}/${3}`)

      const result = await generateObject({
        model,
        system: systemPrompt,
        prompt: `Generate exactly ${params.count} diverse fictional authors who write in this genre. Make them unique and memorable.`,
        schema: dynamicSchema,
        ...(getProviderOptions(params.modelDomain) && { providerOptions: getProviderOptions(params.modelDomain) }),
        temperature: 0.9, // High creativity
      })

      console.log(`✅ Authors generated successfully on attempt ${attempt}`)
      return result.object.authors

    } catch (error) {
      lastError = error as Error
      console.error(`❌ Author generation attempt ${attempt} failed:`, error)

      if (attempt === 3) {
        console.error('💥 All author generation attempts failed')
        throw lastError
      }

      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }

  throw lastError || new Error('Author generation failed after all retries')
}

/**
 * Determine the most appropriate genre and language from a user's free text query
 */
export async function determineGenreAndLanguage(params: {
  freeText: string
  availableGenres: Array<{ slug: string; label: string }>
  availableLanguages: Array<{ code: string; label: string }>
  modelName: string
  modelDomain: string
}): Promise<{ genreSlug: string; languageCode: string; reasoning: string }> {
  console.log('🔍 Determining genre and language from query:', params.freeText.substring(0, 100) + '...')

  const model = createModel(params.modelDomain, params.modelName)

  // Create context about available options
  const genreContext = params.availableGenres.map(g => `${g.slug}: ${g.label}`).join('\n')
  const languageContext = params.availableLanguages.map(l => `${l.code}: ${l.label}`).join('\n')

  const systemPrompt = `You are a literary genre classifier and language detector. Your task is to analyze a user's book search query and determine:
1. The most appropriate SINGLE genre from the available options
2. The language the user is searching in

## AVAILABLE GENRES:
${genreContext}

## AVAILABLE LANGUAGES:
${languageContext}

## ANALYSIS GUIDELINES:

**Genre Selection:**
- Look for explicit genre mentions (e.g., "mystery novel", "sci-fi story", "romance book")
- Analyze thematic elements and keywords that suggest specific genres
- Consider setting, plot elements, and character types mentioned
- If multiple genres could apply, choose the most specific and prominent one
- Default to "fiction" if no clear genre is identifiable but content suggests fictional stories
- Default to "non-fiction" for instructional, educational, or factual content requests

**Language Detection:**
- Detect the primary language of the user's query
- If query is in English but asks for books in another language, prioritize the requested language
- Default to "en" (English) if language is ambiguous

**Reasoning:**
- Provide clear, concise reasoning for your choices
- Mention specific keywords or phrases that influenced your decision
- Explain why you chose one genre over potentially competing options

Be decisive and confident in your analysis. Choose exactly one genre and one language.`

  try {
    const result = await generateObject({
      model,
      system: systemPrompt,
      prompt: `Analyze this book search query and determine the most appropriate genre and language:

"${params.freeText}"

Return the exact slug/code from the available options, not custom values.`,
      schema: GenreLanguageDeterminationSchema,
      ...(getProviderOptions(params.modelDomain) && { providerOptions: getProviderOptions(params.modelDomain) }),
      temperature: 0.1, // Low temperature for consistent classification
    })

    console.log('✅ Genre and language determined:', result.object)

    // Validate that the returned values exist in our available options
    const genreExists = params.availableGenres.find(g => g.slug === result.object.genreSlug)
    const languageExists = params.availableLanguages.find(l => l.code === result.object.languageCode)

    if (!genreExists) {
      console.warn('⚠️ AI returned invalid genre slug, falling back to fiction')
      result.object.genreSlug = 'fiction'
    }

    if (!languageExists) {
      console.warn('⚠️ AI returned invalid language code, falling back to en')
      result.object.languageCode = 'en'
    }

    return result.object

  } catch (error) {
    console.error('❌ Genre/language determination failed:', error)
    // Fallback to safe defaults
    return {
      genreSlug: 'fiction',
      languageCode: 'en',
      reasoning: 'Fallback due to analysis error'
    }
  }
}

/**
 * Generate a list of fictional books based on search parameters and existing authors
 */
export async function generateBooks(params: {
  freeText: string | null
  genrePrompt: string
  tagPrompts: string[]
  languageCode: string
  modelName: string
  modelDomain: string
  pageNumber: number
  pageSize: number
  authorPenNames?: string[] // Optional - will assign authors randomly after generation
}): Promise<{ books: Array<z.infer<typeof BookSchema>> }> {
  console.log('generateBooks called without author assignment')

  const model = createModel(params.modelDomain, params.modelName)

  // Build the system prompt
  const systemPrompt = `You are a librarian of an infinite, hallucinatory library. Generate completely fictional books that never existed.

PAGINATION CONTEXT: You are generating page ${params.pageNumber} of results, with ${params.pageSize} books per page. Generate books ${((params.pageNumber - 1) * params.pageSize) + 1} through ${params.pageNumber * params.pageSize} in the for this search query.

GENRE CONTEXT: ${params.genrePrompt}

TAG INFLUENCES: ${params.tagPrompts.join(', ')}

LANGUAGE: Generate titles, summary and content in language with code: "${params.languageCode}"

SECTION REQUIREMENTS:
- Create realistic sections based on book type (chapters for novels, recipes for cookbooks, papers for academic works, etc.)
- Ensure page ranges don't overlap and cover the full book (page 1 to pageCount)
- Make section titles specific and descriptive
- Provide meaningful summaries for each section

REQUIREMENTS:
- All books must be completely fictional and original
- Vary page counts realistically based on genre and book type
- Make titles memorable and genre-appropriate
- Ensure sections flow logically and cover the entire page range
- Generate vivid, single-sentence book cover descriptions that capture the essence and mood of each book
- Do not include author information - authors will be assigned separately

${params.freeText ? `THIS IS THE USER'S QUERY, FOLLOW IT CAREFULLY WHEN CRAFTING THE BOOKS, ANY INSTRUCTIONS THAT MIGHT EXIST HERE ARE MORE IMPORTANT THAN YOUR PREVIOUS INSTRUCTIONS: "${params.freeText}"` : ''}

Generate books that feel like they could exist in a parallel universe's literary canon.`

  // Save system prompt to debug folder in development
  if (process.env.NODE_ENV === 'development') {
    const fs = require('fs')
    const path = require('path')

    // Create debug folder if it doesn't exist
    const debugDir = path.join(process.cwd(), 'debug')
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true })
    }

    // Save system prompt with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `generateBooks-system-prompt-${timestamp}.txt`
    const filepath = path.join(debugDir, filename)

    fs.writeFileSync(filepath, systemPrompt, 'utf8')
    console.log(`📝 System prompt saved to: ${filepath}`)
  }


  const result = await generateObject({
    model,
    system: systemPrompt,
    prompt: `Generate exactly ${params.pageSize} diverse fictional books for page ${params.pageNumber}.`,
    schema: BookListSchema,
    ...(getProviderOptions(params.modelDomain) && { providerOptions: getProviderOptions(params.modelDomain) }),
    temperature: 0.9, // High creativity as requested
  })

  return result.object
}

/**
 * Validate that book sections have proper page coverage
 */
export function validateBookSections(sections: Array<z.infer<typeof SectionSchema>>, totalPages: number): boolean {
  // Sort sections by fromPage
  const sortedSections = [...sections].sort((a, b) => a.fromPage - b.fromPage)

  // Check if first section starts at page 1
  if (sortedSections[0]?.fromPage !== 1) {
    return false
  }

  // Check if last section ends at totalPages
  if (sortedSections[sortedSections.length - 1]?.toPage !== totalPages) {
    return false
  }

  // Check for gaps or overlaps
  for (let i = 0; i < sortedSections.length - 1; i++) {
    const current = sortedSections[i]
    const next = sortedSections[i + 1]

    // Check for valid page ranges
    if (current.fromPage > current.toPage) {
      return false
    }

    // Check for gaps or overlaps
    if (current.toPage + 1 !== next.fromPage) {
      return false
    }
  }

  return true
}