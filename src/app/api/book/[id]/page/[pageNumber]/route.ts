import { NextRequest, NextResponse } from 'next/server'
import { streamText } from 'ai'
import { createSupabaseServerClient } from '@/lib/supabase'
import { getAIProvider } from '@/lib/ai'

interface RouteParams {
  params: Promise<{
    id: string
    pageNumber: string
  }>
}

// Allow streaming responses up to 30 seconds
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
      .single()

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

    // Get edition details including book, author, and model info
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
      .single()

    if (editionError || !editionDetails) {
      console.error('❌ Edition not found:', editionError)
      return NextResponse.json(
        { error: 'Edition not found' },
        { status: 404 }
      )
    }

    // Get previous page content for context (if page > 1)
    let previousPageContent = ''
    if (parseInt(pageNumber) > 1) {
      const { data: previousPage } = await supabase
        .from('book_pages')
        .select('content')
        .eq('edition_id', editionId)
        .eq('page_number', parseInt(pageNumber) - 1)
        .single()

      if (previousPage) {
        previousPageContent = previousPage.content
      }
    }

    // Get book sections for context
    const { data: sections } = await supabase
      .from('book_sections')
      .select('title, from_page, to_page, summary')
      .eq('book_id', editionDetails.book_id)
      .order('order_index')

    // Find which section this page belongs to
    const currentSection = sections?.find(section => 
      parseInt(pageNumber) >= section.from_page && parseInt(pageNumber) <= section.to_page
    )

    // Get AI provider and model
    const aiProvider = await getAIProvider(editionDetails.models.domain_code, editionDetails.models.name)

    // Determine genre-specific formatting
    const formatInstructions = getFormatInstructions(editionDetails.books.title)

    // Build system prompt
    const systemPrompt = `You are writing page ${pageNumber} of "${editionDetails.books.title}" by ${editionDetails.books.authors.pen_name}.

Book Summary: ${editionDetails.books.summary}

Author Style: ${editionDetails.books.authors.style_prompt || 'Write in an engaging, narrative style.'}

${currentSection ? `Current Section: "${currentSection.title}" - ${currentSection.summary}` : ''}

${previousPageContent ? `Previous Page Content:\n${previousPageContent}\n\n` : ''}

${formatInstructions}

Write page ${pageNumber} of ${editionDetails.books.page_count}. Make it engaging and continue the narrative naturally.`

    // Use the messages from the request (for useChat compatibility)
    // Add system message if not present
    const allMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ]

    console.log('🤖 Starting streaming generation with provider:', editionDetails.models.name)

    const result = streamText({
      model: aiProvider,
      messages: allMessages,
      temperature: 0.8,
      maxTokens: 2000,
    })

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

function getFormatInstructions(title: string): string {
  const lowerTitle = title.toLowerCase()
  
  if (lowerTitle.includes('cookbook') || lowerTitle.includes('recipe')) {
    return `Format as a cookbook page with recipes, ingredients, and cooking instructions. Use markdown formatting:
- **Recipe Name**
- *Ingredients:*
- *Instructions:*`
  }
  
  if (lowerTitle.includes('poetry') || lowerTitle.includes('poem')) {
    return `Format as poetry with proper line breaks and stanza separation. Use markdown formatting for emphasis.`
  }
  
  if (lowerTitle.includes('manual') || lowerTitle.includes('guide') || lowerTitle.includes('academic')) {
    return `Format as an academic/manual page with:
- Clear headings using ## and ###
- Bullet points for lists
- **Bold** for key terms
- Code blocks for examples if relevant`
  }
  
  return `Format as a narrative page with:
- Natural paragraph breaks
- *Italics* for emphasis or thoughts
- **Bold** for important moments
- Proper dialogue formatting`
} 