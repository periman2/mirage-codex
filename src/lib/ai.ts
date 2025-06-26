import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { z } from 'zod'

// Model configurations
export const modelConfigs = {
  'gpt-4o': openai('gpt-4o'),
  'gpt-4.1': openai('gpt-4.1'),
  'gpt-4.1-mini': openai('gpt-4.1-mini'),
  'claude-4-sonnet': anthropic('claude-4-sonnet-20250514'),
  'gemini-2.5-pro': google('gemini-2.5-pro'),
  'gemini-2.5-flash': google('gemini-2.5-flash'),
  'gemini-2.5-flash-lite': google('gemini-2.5-flash-lite-preview-06-17'),
}

// Schemas for structured generation
export const AuthorSchema = z.object({
  penName: z.string().describe('The author\'s pen name'),
  stylePrompt: z.string().describe('A brief description of the author\'s writing style'),
  bio: z.string().describe('A fictional biography of the author (2-3 sentences)'),
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
  pageCount: z.number().min(5).max(150).describe('Realistic page count for this type of book'),
  author: AuthorSchema.optional().describe('Author information - only include if creating a new author'),
  authorPenName: z.string().optional().describe('Pen name of existing author from database - only include if using existing author'),
  sections: z.array(SectionSchema).min(3).max(20).describe('Book sections with page ranges and summaries'),
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
  existingAuthorPenNames?: string[]
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

AUTHOR ASSIGNMENT:
${params.existingAuthorPenNames && params.existingAuthorPenNames.length > 0 
  ? `- For some books, use existing authors by setting "authorPenName" to one of: ${params.existingAuthorPenNames.join(', ')}
- For other books, create new authors by providing "author" object
- Mix both approaches for variety` 
  : `- Create new authors for all books by providing "author" object`}

SECTION REQUIREMENTS:
- Create realistic sections based on book type (chapters for novels, recipes for cookbooks, papers for academic works, etc.)
- Ensure page ranges don't overlap and cover the full book (page 1 to pageCount)
- Make section titles specific and descriptive
- Provide meaningful summaries for each section

BOOK TYPE EXAMPLES:
- Novel: Chapters with narrative progression
- Cookbook: Recipe sections with ingredient lists and techniques
- Academic: Introduction, methodology, results, conclusion
- Poetry: Thematic collections or chronological arrangements
- Biography: Life periods or significant events
- Manual: Step-by-step guides and reference sections

REQUIREMENTS:
- All books must be completely fictional and original
- Vary page counts realistically based on genre and book type
- Create compelling summaries that make readers want to explore
- Make titles memorable and genre-appropriate
- Ensure sections flow logically and cover the entire page range

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
  sections: Array<z.infer<typeof SectionSchema>>
  languageCode: string
  modelName: string
}): Promise<string> {
  const model = modelConfigs[params.modelName as keyof typeof modelConfigs]
  if (!model) {
    throw new Error(`Unsupported model: ${params.modelName}`)
  }

  // Find which section this page belongs to
  const currentSection = params.sections.find(section => 
    params.pageNumber >= section.fromPage && params.pageNumber <= section.toPage
  )
  
  if (!currentSection) {
    throw new Error(`No section found for page ${params.pageNumber}`)
  }

  // Calculate position within the section
  const sectionProgress = (params.pageNumber - currentSection.fromPage) / (currentSection.toPage - currentSection.fromPage)
  const isFirstPageOfSection = params.pageNumber === currentSection.fromPage
  const isLastPageOfSection = params.pageNumber === currentSection.toPage
  
  const systemPrompt = `You are writing page ${params.pageNumber} of ${params.totalPages} for the book "${params.bookTitle}" by ${params.authorName}.

AUTHOR STYLE: ${params.authorStyle}

CURRENT SECTION: ${currentSection.title}
SECTION SUMMARY: ${currentSection.summary}
SECTION PAGES: ${currentSection.fromPage}-${currentSection.toPage}
POSITION IN SECTION: ${Math.round(sectionProgress * 100)}% through this section
${isFirstPageOfSection ? 'THIS IS THE FIRST PAGE OF THIS SECTION' : ''}
${isLastPageOfSection ? 'THIS IS THE LAST PAGE OF THIS SECTION' : ''}

LANGUAGE: Write in language code "${params.languageCode}"

REQUIREMENTS:
- Write authentic content that matches the author's style and book type
- Make this page feel like part of the larger section and book
- Include proper paragraph breaks and formatting
- Write approximately 250-400 words per page
- Maintain consistency with the book's genre and tone
- Do not include page numbers or headers in the content
- If first page of section, consider introducing the section topic
- If last page of section, consider concluding the section appropriately

Write compelling, immersive content that draws readers into this fictional world.`

  const result = await generateObject({
    model,
    system: systemPrompt,
    prompt: `Write the content for page ${params.pageNumber}, which is ${Math.round(sectionProgress * 100)}% through the "${currentSection.title}" section.`,
    schema: PageContentSchema,
    temperature: 0.7,
  })

  return result.object.content
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