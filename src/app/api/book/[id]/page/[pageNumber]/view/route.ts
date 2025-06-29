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
    const authHeader = request.headers.get('authorization')
    
    // Get client IP and user agent for analytics
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               '127.0.0.1'
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    // Get edition ID from request body
    const { editionId, sessionId } = await request.json()

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
      .single()

    if (pageError || !page) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      )
    }

    const pageId = page.id

    // Get user if authenticated (views can be anonymous)
    let userId: string | null = null

    if (authHeader) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(
        authHeader.replace('Bearer ', '')
      )
      userId = user?.id || null
    }

    // Rate limiting: check for recent views from same IP/user
    // to prevent spam (within last 30 seconds for pages since they're viewed more frequently)
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString()
    
    let recentViewQuery = supabase
      .from('page_view_events')
      .select('id')
      .eq('page_id', pageId)
      .gte('created_at', thirtySecondsAgo)

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
      .from('page_view_events')
      .insert({
        page_id: pageId,
        user_id: userId,
        session_id: sessionId || null,
        ip_address: ip,
        user_agent: userAgent
      })

    if (viewError) {
      console.error('Error recording page view:', viewError)
      return NextResponse.json(
        { error: 'Failed to record view' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Page view recorded successfully',
      counted: true
    })

  } catch (error) {
    console.error('Page view API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 