import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'

interface RouteParams {
  params: Promise<{
    id: string
    pageNumber: string
  }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { editionId, content } = await request.json()
    const { pageNumber } = await params
    
    console.log('💾 Saving page content:', { editionId, pageNumber })

    const supabase = await createSupabaseServerClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Save the page content using admin client (required for RLS)
    const adminSupabase = createSupabaseAdminClient()
    const { error } = await adminSupabase
      .from('book_pages')
      .insert({
        edition_id: editionId,
        page_number: parseInt(pageNumber),
        content: content
      })

    if (error) {
      console.error('❌ Failed to save page:', error)
      return NextResponse.json(
        { error: 'Failed to save page content' },
        { status: 500 }
      )
    }

    console.log('✅ Page saved successfully')
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('💥 Save page error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 