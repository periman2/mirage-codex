import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

// Create admin client for bypassing RLS in triggers
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageNumber: string }> }
) {
  try {
    const { id: bookId, pageNumber } = await params
    const pageNum = parseInt(pageNumber)

    // Get user from session
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Get the page ID from edition and page number
    const { editionId } = await request.json()
    
    const { data: page, error: pageError } = await supabase
      .from('book_pages')
      .select('id')
      .eq('edition_id', editionId)
      .eq('page_number', pageNum)
      .limit(1)
      .maybeSingle()

    if (pageError || !page) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      )
    }

    const pageId = page.id

    // Use RPC function to toggle like atomically
    const { data: result, error: rpcError } = await supabaseAdmin
      .rpc('toggle_page_like', {
        p_user_id: user.id,
        p_page_id: pageId
      })

    if (rpcError) {
      console.error('Error toggling page like:', rpcError)
      return NextResponse.json(
        { error: 'Failed to toggle like' },
        { status: 500 }
      )
    }

    if (!result) {
      return NextResponse.json(
        { error: 'No result from toggle function' },
        { status: 500 }
      )
    }

    // Type cast the result since we know the structure from our RPC function
    const typedResult = result as { success: boolean; liked: boolean; likes_count: number }

    return NextResponse.json({
      success: true,
      liked: typedResult.liked,
      likes: typedResult.likes_count,
      message: typedResult.liked ? 'Page liked successfully' : 'Page unliked successfully'
    })

  } catch (error) {
    console.error('Page like API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageNumber: string }> }
) {
  try {
    const { pageNumber } = await params
    const pageNum = parseInt(pageNumber)
    const url = new URL(request.url)
    const editionId = url.searchParams.get('editionId')
    
    if (!editionId) {
      return NextResponse.json(
        { error: 'Edition ID required' },
        { status: 400 }
      )
    }

    // Get the page ID from edition and page number
    const { data: page, error: pageError } = await supabase
      .from('book_pages')
      .select('id')
      .eq('edition_id', editionId)
      .eq('page_number', pageNum)
      .limit(1)
      .maybeSingle()

    if (pageError || !page) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      )
    }

    const pageId = page.id
    const authHeader = request.headers.get('authorization')

    // Get current like status for user (if authenticated)
    let userLiked = false
    if (authHeader) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(
        authHeader.replace('Bearer ', '')
      )

      if (user) {
        const { data: existingLike } = await supabase
          .from('page_reactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('page_id', pageId)
          .eq('reaction_type', 'like')
          .limit(1)
          .maybeSingle()

        userLiked = !!existingLike
      }
    }

    // Get page stats
    const { data: stats, error: statsError } = await supabase
      .from('page_stats')
      .select('likes_cnt, views_cnt')
      .eq('page_id', pageId)
      .limit(1)
      .maybeSingle()

    if (statsError) {
      console.error('Error fetching page stats:', statsError)
      return NextResponse.json(
        { error: 'Failed to fetch page stats' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      userLiked,
      likes: stats?.likes_cnt || 0,
      views: stats?.views_cnt || 0
    })

  } catch (error) {
    console.error('Page stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 