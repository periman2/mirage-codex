import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

// POST - Create a new edition
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params
    const supabase = await createSupabaseServerClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { languageId, modelId } = body

    if (!languageId || !modelId) {
      return NextResponse.json({ 
        error: 'Language ID and Model ID are required' 
      }, { status: 400 })
    }

    // Verify the book exists and get its details
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, title')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Check if this language+model combination already exists for this book
    const { data: existingEdition, error: checkError } = await supabase
      .from('editions')
      .select('id')
      .eq('book_id', bookId)
      .eq('language_id', languageId)
      .eq('model_id', modelId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('❌ Error checking existing edition:', checkError)
      return NextResponse.json({ error: 'Failed to check existing editions' }, { status: 500 })
    }

    if (existingEdition) {
      return NextResponse.json({ 
        error: 'An edition with this language and model combination already exists',
        existingEditionId: existingEdition.id
      }, { status: 409 })
    }

    // Verify the language and model exist
    const [languageCheck, modelCheck] = await Promise.all([
      supabase.from('languages').select('id, label').eq('id', languageId).single(),
      supabase.from('models').select('id, name, model_domains(label)').eq('id', modelId).single()
    ])

    if (languageCheck.error || !languageCheck.data) {
      return NextResponse.json({ error: 'Invalid language ID' }, { status: 400 })
    }

    if (modelCheck.error || !modelCheck.data) {
      return NextResponse.json({ error: 'Invalid model ID' }, { status: 400 })
    }

    // Create the new edition
    const { data: newEdition, error: createError } = await supabase
      .from('editions')
      .insert({
        book_id: bookId,
        language_id: languageId,
        model_id: modelId
      })
      .select(`
        id,
        language_id,
        model_id,
        created_at,
        languages (
          id,
          code,
          label
        ),
        models (
          id,
          name,
          domain_code,
          model_domains (
            label
          )
        )
      `)
      .single()

    if (createError) {
      console.error('❌ Error creating edition:', createError)
      return NextResponse.json({ error: 'Failed to create edition' }, { status: 500 })
    }

    // Transform the response to match expected format
    const transformedEdition = {
      id: newEdition.id,
      languageId: newEdition.language_id,
      modelId: newEdition.model_id,
      createdAt: newEdition.created_at,
      language: newEdition.languages?.label || 'Unknown',
      languageCode: newEdition.languages?.code || 'unknown',
      modelName: `${newEdition.models?.model_domains?.label} - ${newEdition.models?.name}` || 'Unknown Model',
      modelDomain: newEdition.models?.domain_code || 'unknown'
    }

    console.log('✅ Created new edition:', transformedEdition.id)
    return NextResponse.json({ 
      edition: transformedEdition,
      message: 'Edition created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Error in POST /api/book/[id]/editions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 