import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { z } from 'zod'

// Model configurations
export const modelConfigs = {
  'gpt-4o': openai('gpt-4o'),
  'gpt-4': openai('gpt-4'),
  'claude-3-5-sonnet': anthropic('claude-3-5-sonnet-20241022'),
  'claude-3-haiku': anthropic('claude-3-haiku-20240307'),
  'gemini-1.5-pro': google('gemini-1.5-pro'),
  'gemini-1.5-flash': google('gemini-1.5-flash'),
}

// Schemas for structured generation
export const AuthorSchema = z.object({
  penName: z.string().describe('The author\'s pen name'),
  stylePrompt: z.string().describe('A brief description of the author\'s writing style'),
  bio: z.string().describe('A fictional biography of the author (2-3 sentences)'),
})

export const BookSchema = z.object({
  title: z.string().describe('The book title'),
  summary: z.string().describe('A compelling book summary (2-3 sentences)'),
  pageCount: z.number().min(50).max(800).describe('Realistic page count for this type of book'),
  author: AuthorSchema,
  outline: z.array(z.string()).describe('Chapter titles or section names (5-15 items)'),
})

export const BookListSchema = z.object({
  books: z.array(BookSchema).min(8).max(20).describe('A list of fictional books matching the search criteria'),
})

export const PageContentSchema = z.object({
  content: z.string().describe('The full text content of this book page'),
})

/**
 * Generate a list of fictional books based on search parameters
 */
export async function generateBooks(params: {
  freeText: string | null
  genrePrompt: string
  tagPrompts: string[]
  languageCode: string
  modelName: string
}): Promise<{ books: Array<z.infer<typeof BookSchema>> }> {
  const model = modelConfigs[params.modelName as keyof typeof modelConfigs]
  if (!model) {
    throw new Error(`Unsupported model: ${params.modelName}`)
  }

  // Build the system prompt
  const systemPrompt = `You are a librarian of an infinite, hallucinatory library. Generate completely fictional books that never existed.

GENRE CONTEXT: ${params.genrePrompt}

TAG INFLUENCES: ${params.tagPrompts.join(', ')}

LANGUAGE: Generate titles and content in language code "${params.languageCode}"

REQUIREMENTS:
- All books must be completely fictional and original
- Include diverse authors with unique writing styles
- Vary page counts realistically based on genre
- Create compelling summaries that make readers want to explore
- Ensure author bios feel authentic but are entirely fictional
- Make titles memorable and genre-appropriate

${params.freeText ? `USER QUERY: "${params.freeText}"` : ''}

Generate books that feel like they could exist in a parallel universe's literary canon.`

  const result = await generateObject({
    model,
    system: systemPrompt,
    prompt: 'Generate a diverse collection of fictional books for this infinite library.',
    schema: BookListSchema,
    temperature: 0.8, // Higher creativity
  })

  return result.object
}

/**
 * Generate content for a specific page of a book
 */
export async function generatePage(params: {
  bookTitle: string
  authorName: string
  authorStyle: string
  pageNumber: number
  totalPages: number
  outline: string[]
  languageCode: string
  modelName: string
}): Promise<string> {
  const model = modelConfigs[params.modelName as keyof typeof modelConfigs]
  if (!model) {
    throw new Error(`Unsupported model: ${params.modelName}`)
  }

  // Determine which chapter/section this page belongs to
  const progressRatio = params.pageNumber / params.totalPages
  const chapterIndex = Math.floor(progressRatio * params.outline.length)
  const currentChapter = params.outline[chapterIndex] || params.outline[0]
  
  const systemPrompt = `You are writing page ${params.pageNumber} of ${params.totalPages} for the book "${params.bookTitle}" by ${params.authorName}.

AUTHOR STYLE: ${params.authorStyle}

CURRENT SECTION: ${currentChapter}

LANGUAGE: Write in language code "${params.languageCode}"

REQUIREMENTS:
- Write authentic literary content that matches the author's style
- Make this page feel like part of a larger, coherent narrative
- Include proper paragraph breaks and formatting
- Write approximately 250-400 words per page
- Maintain consistency with the book's genre and tone
- Do not include page numbers or headers in the content

Write compelling, immersive content that draws readers into this fictional world.`

  const result = await generateObject({
    model,
    system: systemPrompt,
    prompt: `Write the content for page ${params.pageNumber}, which should be part of the "${currentChapter}" section.`,
    schema: PageContentSchema,
    temperature: 0.7,
  })

  return result.object.content
}

/**
 * Get available models for a domain
 */
export function getModelsForDomain(domain: string): string[] {
  switch (domain) {
    case 'openai':
      return ['gpt-4o', 'gpt-4']
    case 'anthropic':
      return ['claude-3-5-sonnet', 'claude-3-haiku']
    case 'google':
      return ['gemini-1.5-pro', 'gemini-1.5-flash']
    default:
      return []
  }
}

/**
 * Get API key for a model domain from user's BYO keys or environment
 */
export function getApiKeyForDomain(domain: string, userApiKey?: string): string | undefined {
  if (userApiKey) {
    return userApiKey
  }

  switch (domain) {
    case 'openai':
      return process.env.OPENAI_API_KEY
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY
    case 'google':
      return process.env.GOOGLE_AI_API_KEY
    default:
      return undefined
  }
} 