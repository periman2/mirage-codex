import { NextRequest, NextResponse } from 'next/server'
import { streamText } from 'ai'
import { createSupabaseServerClient } from '@/lib/supabase'
import { getAIProvider, getProviderOptions } from '@/lib/ai'
import { getPageGenerationCreditCost } from '@/lib/credit-constants'
import { getPageGenerationConfig, isFeatureEnabled } from '@/lib/project-config'
import fs from 'fs'
import path from 'path'

interface RouteParams {
  params: Promise<{
    id: string
    pageNumber: string
  }>
}

// Configuration constants will be loaded from project_config table

// Allow streaming responses up to configured duration (default 60 seconds)
// Note: This will be dynamically loaded from project config in the handler
export const maxDuration = 60

// GET endpoint to check if page exists
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const url = new URL(request.url)
    const editionId = url.searchParams.get('editionId')
    const { pageNumber } = await params

    if (!editionId) {
      return NextResponse.json(
        { error: 'Edition ID is required' },
        { status: 400 }
      )
    }

    console.log('📖 Checking if page exists:', { editionId, pageNumber })

    const supabase = await createSupabaseServerClient()

    // Check if page already exists for this edition
    const { data: existingPage } = await supabase
      .from('book_pages')
      .select('content')
      .eq('edition_id', editionId)
      .eq('page_number', parseInt(pageNumber))
      .limit(1)
      .maybeSingle()

    if (existingPage) {
      console.log('✅ Page found in cache')
      return NextResponse.json({
        exists: true,
        content: existingPage.content
      })
    } else {
      console.log('❌ Page not found in cache')
      return NextResponse.json({
        exists: false
      })
    }

  } catch (error) {
    console.error('💥 Page check error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint for streaming generation
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { messages, editionId } = await request.json()

    const { pageNumber } = await params

    console.log('📚 Page generation request:', { editionId, pageNumber })

    const supabase = await createSupabaseServerClient()

    // Load project configuration
    const pageGenConfig = await getPageGenerationConfig()
    
    // Check if image generation feature is enabled
    const imagesEnabled = await isFeatureEnabled('book_page_images')
    console.log('🎨 Images enabled:', imagesEnabled)

    // Get edition details including book, author, genre, and model info
    const { data: editionDetails, error: editionError } = await supabase
      .from('editions')
      .select(`
        id,
        book_id,
        model_id,
        language_id,
        books (
          id,
          title,
          summary,
          page_count,
          authors (
            pen_name,
            style_prompt,
            bio
          ),
          genres (
            label,
            slug,
            book_format_prompt,
            tokens_per_page,
            model_temperature
          )
        ),
        models (
          name,
          domain_code
        ),
        languages (
          code,
          label
        )
      `)
      .eq('id', editionId)
      .limit(1)
      .maybeSingle()

    if (editionError || !editionDetails) {
      console.error('❌ Edition not found:', editionError)
      return NextResponse.json(
        { error: 'Edition not found' },
        { status: 404 }
      )
    }

    // Get the original search query that generated this book
    console.log('🔍 Fetching original search query for book:', editionDetails.book_id)
    const { data: searchContext } = await supabase
      .from('search_books')
      .select(`
        searches (
          id,
          search_params (
            free_text,
            tag_ids
          )
        )
      `)
      .eq('book_id', editionDetails.book_id)
      .limit(1)
      .maybeSingle()

    // Extract search context
    let originalSearchQuery = null
    let searchTags: string[] = []
    
    if (searchContext?.searches?.search_params) {
      originalSearchQuery = searchContext.searches.search_params.free_text
      const tagIds = searchContext.searches.search_params.tag_ids || []
      
      // Get tag names if there are tag IDs
      if (tagIds.length > 0) {
        const { data: tags } = await supabase
          .from('tags')
          .select('label')
          .in('id', tagIds)
        
        searchTags = tags?.map(tag => tag.label) || []
      }
    }

    console.log('🔍 Original search context:', { 
      originalSearchQuery, 
      searchTags: searchTags.length > 0 ? searchTags : 'none' 
    })

    // Check authentication and credits
    console.log('👤 Checking authentication and credits...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ No authenticated user found')
      return NextResponse.json(
        { error: 'Authentication required for page generation' },
        { status: 401 }
      )
    }

    // Check for BYO API key first 
    console.log('🔑 Checking for user API key...')
    const { data: userApiKey } = await supabase
      .from('user_api_keys')
      .select('api_key_enc')
      .eq('user_id', user.id)
      .eq('domain_code', editionDetails.models.domain_code)
      .limit(1)
      .maybeSingle()

    console.log('🔑 User API key found:', !!userApiKey)
    const hasApiKey = !!userApiKey

    // Check user credits if not using BYO key (but don't deduct yet)
    if (!hasApiKey) {
      const pageGenerationCreditCost = await getPageGenerationCreditCost(editionDetails.model_id)
      console.log(`💰 Page generation will cost ${pageGenerationCreditCost} credits for model ${editionDetails.model_id}`)
      
      console.log('💳 Checking if user has enough credits...')
      
      const { data: hasEnoughCredits, error: creditCheckError } = await supabase
        .rpc('check_user_credits', { 
          p_user_id: user.id, 
          p_credits_needed: pageGenerationCreditCost 
        })

      if (creditCheckError) {
        console.error('❌ Error checking credits:', creditCheckError)
        return NextResponse.json(
          { error: 'Failed to check user credits' },
          { status: 500 }
        )
      }

      console.log('💰 Credit check result:', hasEnoughCredits, 'needed:', pageGenerationCreditCost)

      if (!hasEnoughCredits) {
        console.log('❌ Insufficient credits')
        return NextResponse.json(
          { 
            error: 'Insufficient credits for page generation',
            creditsNeeded: pageGenerationCreditCost,
            message: `You need ${pageGenerationCreditCost} credits to generate a page. Please upgrade your plan or add more credits.`
          },
          { status: 402 }
        )
      }
      
      console.log('✅ User has sufficient credits - proceeding with generation')
      console.log('💡 Credits will be deducted when page is saved via /save endpoint')
    } else {
      console.log('⏭️ Using BYO API key - no credit check needed')
    }

    // Get previous pages content for context (last context_pages_count pages)
    let contextPagesContent = ''
    const currentPageNum = parseInt(pageNumber)
    if (currentPageNum > 1) {
      const startPage = Math.max(1, currentPageNum - pageGenConfig.context_pages_count)
      const endPage = currentPageNum - 1

      const { data: contextPages } = await supabase
        .from('book_pages')
        .select('page_number, content')
        .eq('edition_id', editionId)
        .gte('page_number', startPage)
        .lte('page_number', endPage)
        .order('page_number', { ascending: true })

      if (contextPages && contextPages.length > 0) {
        contextPagesContent = contextPages
          .map(page => `--- Page ${page.page_number} ---\n${page.content}`)
          .join('\n\n')
      }
    }

    // Get book sections for context
    const { data: sections } = await supabase
      .from('book_sections')
      .select('title, from_page, to_page, summary, order_index')
      .eq('book_id', editionDetails.book_id)
      .order('order_index')

    // Find which section this page belongs to and categorize all sections
    let currentSection: any = null
    let currentSectionIndex = -1
    const pastSections: any[] = []
    const futureSections: any[] = []

    sections?.forEach((section, index) => {
      if (currentPageNum >= section.from_page && currentPageNum <= section.to_page) {
        currentSection = section
        currentSectionIndex = index
      } else if (section.to_page < currentPageNum) {
        pastSections.push(section)
      } else if (section.from_page > currentPageNum) {
        futureSections.push(section)
      }
    })

    // Calculate progress within current section
    let sectionProgress = ''
    if (currentSection) {
      const sectionLength = currentSection.to_page - currentSection.from_page + 1
      const pageInSection = currentPageNum - currentSection.from_page + 1
      const progressPercent = Math.round((pageInSection / sectionLength) * 100)
      sectionProgress = ` (Page ${pageInSection} of ${sectionLength} pages, ${progressPercent}% through section)`
    }

    // Get AI provider and model
    const aiProvider = await getAIProvider(editionDetails.models.domain_code, editionDetails.models.name)

    // Get genre-specific settings
    const genre = editionDetails.books.genres
    const modelTemperature = genre.model_temperature || pageGenConfig.default_temperature
    const tokensPerPage = genre.tokens_per_page || 500
    const formatInstructions = genre.book_format_prompt || `Format as a narrative page with natural paragraph breaks and proper dialogue formatting.`

    // Build comprehensive system prompt
    const systemPrompt = `You are the primary book author for the MirageCodex platform, a sophisticated AI-powered book creation system. You are currently writing "${editionDetails.books.title}" in the ${genre.label} genre.

## AUTHOR IDENTITY & STYLE
You are writing as ${editionDetails.books.authors.pen_name}, and you must embody their unique voice and style throughout.

**Author Bio:** ${editionDetails.books.authors.bio || 'A skilled author with a distinctive narrative voice.'}

**Writing Style Instructions:** ${editionDetails.books.authors.style_prompt || 'Write in an engaging, narrative style that captivates readers.'}

## BOOK CONTEXT
**Book Title:** "${editionDetails.books.title}"
**Genre:** ${genre.label}
**Total Pages:** ${editionDetails.books.page_count}
**Current Page:** ${pageNumber}
**Language:** ${editionDetails.languages.label}

**Book Summary:** ${editionDetails.books.summary}

${originalSearchQuery || searchTags.length > 0 ? `## ORIGINAL CREATIVE INTENT
This book was generated based on the following user request, which might provide crucial context for how the book should unfold and what themes should be explored:

${originalSearchQuery ? `**User's Original Query:** "${originalSearchQuery}"` : ''}
${searchTags.length > 0 ? `**Additional Themes/Tags:** ${searchTags.join(', ')}` : ''}

Keep this original creative intent in mind as you write this page. The story should honor and develop the themes, concepts, and direction implied by this original request. This context is vital for maintaining consistency with the reader's expectations and the book's intended narrative arc.

` : ''}

## BOOK STRUCTURE & CONTENT ORGANIZATION
${sections && sections.length > 0 ? `
This book is organized into ${sections.length} sections. Here's the complete structure:

${pastSections.length > 0 ? `**COMPLETED SECTIONS:**
${pastSections.map((section, idx) => `${idx + 1}. "${section.title}" (Pages ${section.from_page}-${section.to_page})
   Content: ${section.summary}`).join('\n')}

` : ''}${currentSection ? `**CURRENT SECTION:** "${currentSection.title}" (Pages ${currentSection.from_page}-${currentSection.to_page})${sectionProgress}  
   Content: ${currentSection.summary}
   
   You are currently writing within this section. Consider how this page fits within the section's content flow and development.

` : ''}${futureSections.length > 0 ? `**UPCOMING SECTIONS:**
${futureSections.map((section, idx) => `${pastSections.length + (currentSection ? 2 : 1) + idx}. "${section.title}" (Pages ${section.from_page}-${section.to_page})
   Content: ${section.summary}`).join('\n')}

   Keep these upcoming topics in mind for appropriate transitions and content continuity.` : ''}
` : 'No section structure defined for this book.'}

## PREVIOUS CONTEXT
${contextPagesContent ? `Here are the previous pages for context:\n\n${contextPagesContent}\n\n` : 'This is the beginning of the book.'}

## FORMATTING & STYLE GUIDELINES
DO NOT INCLUDE PAGE NUMBER IN THE CONTENT OF THE PAGE.
DO NOT INCLUDE AUTHOR NAME IN THE CONTENT OF THE PAGE.
DO NOT INCLUDE BOOK TITLE IN THE CONTENT OF THE PAGE.
DO NOT INCLUDE SECTION TITLE IN THE CONTENT OF THE PAGE.
DO NOT REPEAT THE SAME EXACT CONTENT FROM THE PREVIOUS PAGES.
${formatInstructions}

## PAGE LENGTH GUIDANCE
Aim for approximately ${tokensPerPage} words for this page. This should provide the right pacing and depth for the ${genre.label} genre.

${imagesEnabled ? `## IMAGE GENERATION INSTRUCTIONS
If the content, genre, or narrative context calls for a visual element, you may include images using this exact format:
[p=simple one sentence description of the image in lowercase with no special characters]
You should not make images in every page unless the genre is an inherently visual one like an illustrated children's book or a comic book or a cookbook or something like that.
Fantasy book might have some images here and there but not every page!
ALWAYS WRITE THE PROMPTS FOR THE IMAGES IN THE ENGLISH LANGUAGE EVEN IF THE CONTENT OF THE PAGE IS NOT IN ENGLISH.

Example: [p=a mysterious castle silhouetted against a stormy sky]
Example: [p=a steaming bowl of soup with fresh herbs]
Example: [p=two people walking hand in hand through a forest]

Only include images when they genuinely enhance the storytelling experience and fit the genre conventions.` : ''}

## YOUR TASK
Write page ${pageNumber} of ${editionDetails.books.page_count} for "${editionDetails.books.title}". 

**Key Considerations:**
- Continue the content naturally, maintaining consistency with established themes, concepts, and tone
- Make this page engaging and authentic to the ${genre.label} genre while embodying ${editionDetails.books.authors.pen_name}'s distinctive writing style  
- Use the complete book structure above to inform your content development and transitions
${currentSection ? `- Remember you are ${sectionProgress.replace('(', '').replace(')', '')} - develop content accordingly` : ''}
- Consider how this page serves the overall book's purpose while being valuable on its own
- Create appropriate transitions and references to upcoming sections when relevant to the genre`


    if (process.env.NODE_ENV === 'development') {
      const debugDir = path.join(process.cwd(), 'debug')
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true })
      }

      const debugFile = path.join(debugDir, `system-prompt-${editionDetails.books.id}-page-${pageNumber}.txt`)
      
      // Include search context in debug file header
      const debugContent = `=== SEARCH CONTEXT ===
Original Query: ${originalSearchQuery || 'None'}
Search Tags: ${searchTags.length > 0 ? searchTags.join(', ') : 'None'}

=== SYSTEM PROMPT ===
${systemPrompt}`
      
      fs.writeFileSync(debugFile, debugContent)

      console.log('📝 System prompt with search context written to:', debugFile)
    }

    // Use the messages from the request (for useChat compatibility)
    // Add system message if not present
    const allMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ]

    console.log('🤖 Starting streaming generation with provider:', editionDetails.models.name)
    console.log('🎯 Generation context:', {
      originalQuery: originalSearchQuery || 'None',
      searchTags: searchTags.length > 0 ? searchTags : 'None',
      currentPage: pageNumber,
      totalPages: editionDetails.books.page_count,
      genre: genre.label,
      author: editionDetails.books.authors.pen_name
    })

    const result = streamText({
      model: aiProvider,
      messages: allMessages,
      temperature: modelTemperature,
      ...(getProviderOptions(editionDetails.models.domain_code) && { providerOptions: getProviderOptions(editionDetails.models.domain_code) })
    })

    // Note: Credit deduction happens in the save endpoint when page is actually saved
    console.log('💡 Credits will be deducted when page is saved via /save endpoint')

    // Save the generated content to database after streaming completes
    // Note: We'll handle this in the frontend after streaming completes

    return result.toDataStreamResponse()

  } catch (error) {
    console.error('💥 Page generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

