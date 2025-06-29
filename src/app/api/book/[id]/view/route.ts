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
    const authHeader = request.headers.get('authorization')
    
    // Get client IP and user agent for analytics
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               '127.0.0.1'
    const userAgent = request.headers.get('user-agent') || 'Unknown'

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

    // Get user if authenticated (views can be anonymous)
    let userId: string | null = null
    let sessionId: string | null = null

    if (authHeader) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(
        authHeader.replace('Bearer ', '')
      )
      userId = user?.id || null
    }

    // For anonymous users, try to get session ID from request body
    if (!userId) {
      try {
        const body = await request.json()
        sessionId = body.sessionId || null
      } catch {
        // No session ID provided, that's okay
      }
    }

    // Rate limiting: check for recent views from same IP/user
    // to prevent spam (within last minute)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
    
    let recentViewQuery = supabase
      .from('book_view_events')
      .select('id')
      .eq('book_id', bookId)
      .gte('created_at', oneMinuteAgo)

    if (userId) {
      recentViewQuery = recentViewQuery.eq('user_id', userId)
    } else {
      recentViewQuery = recentViewQuery.eq('ip_address', ip)
    }

    const { data: recentViews } = await recentViewQuery.limit(1)

    if (recentViews && recentViews.length > 0) {
      // View already recorded recently, don't double-count
      return NextResponse.json({ 
        success: true, 
        message: 'View already recorded recently',
        counted: false
      })
    }

    // Record the view event using admin client to bypass RLS
    const { error: viewError } = await supabaseAdmin
      .from('book_view_events')
      .insert({
        book_id: bookId,
        user_id: userId,
        session_id: sessionId,
        ip_address: ip,
        user_agent: userAgent
      })

    if (viewError) {
      console.error('Error recording book view:', viewError)
      return NextResponse.json(
        { error: 'Failed to record view' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Book view recorded successfully',
      counted: true
    })

  } catch (error) {
    console.error('Book view API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 