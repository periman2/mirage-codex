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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params

    // Get user from session
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    // Set the auth header for supabase client
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Check if book exists
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      )
    }

    // Use RPC function to toggle like atomically
    const { data: result, error: rpcError } = await supabaseAdmin
      .rpc('toggle_book_like', {
        p_user_id: user.id,
        p_book_id: bookId
      })

    if (rpcError) {
      console.error('Error toggling book like:', rpcError)
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
      message: typedResult.liked ? 'Book liked successfully' : 'Book unliked successfully'
    })

  } catch (error) {
    console.error('Book like API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params
    const authHeader = request.headers.get('authorization')

    // Get current like status for user (if authenticated)
    let userLiked = false
    if (authHeader) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(
        authHeader.replace('Bearer ', '')
      )

      if (user) {
        const { data: existingLike } = await supabase
          .from('book_reactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('book_id', bookId)
          .eq('reaction_type', 'like')
          .single()

        userLiked = !!existingLike
      }
    }

    // Get book stats
    const { data: stats, error: statsError } = await supabase
      .from('book_stats')
      .select('likes_cnt, views_cnt')
      .eq('book_id', bookId)
      .single()

    if (statsError) {
      console.error('Error fetching book stats:', statsError)
      return NextResponse.json(
        { error: 'Failed to fetch book stats' },
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
    console.error('Book stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 