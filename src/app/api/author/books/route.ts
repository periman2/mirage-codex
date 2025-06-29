import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const authorId = searchParams.get('authorId')
    const limit = parseInt(searchParams.get('limit') || '5')
    const offset = parseInt(searchParams.get('offset') || '0')
    const excludeBookId = searchParams.get('excludeBookId')

    if (!authorId) {
      return NextResponse.json(
        { error: 'Author ID is required' },
        { status: 400 }
      )
    }

    // Build the query
    let query = supabase
      .from('books')
      .select(`
        id,
        title,
        page_count,
        created_at,
        languages!books_primary_language_id_fkey (
          label
        ),
        genres (
          label
        ),
        book_stats (
          likes_cnt,
          views_cnt
        )
      `)
      .eq('author_id', authorId)
      .not('id', 'eq', excludeBookId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: books, error, count } = await query

    if (error) {
      console.error('Error fetching author books:', error)
      return NextResponse.json(
        { error: 'Failed to fetch author books' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('books')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', authorId)

    if (excludeBookId) {
      countQuery = countQuery.neq('id', excludeBookId)
    }

    const { count: totalCount } = await countQuery

    // Transform the data to match our interface
    const transformedBooks = books?.map(book => ({
      id: book.id,
      title: book.title,
      pageCount: book.page_count,
      language: book.languages?.label || 'Unknown',
      createdAt: book.created_at,
      genre: {
        label: book.genres?.label || 'Unknown'
      },
      stats: book.book_stats ? {
        likes: book.book_stats.likes_cnt || 0,
        views: book.book_stats.views_cnt || 0
      } : undefined
    })) || []

    const hasMore = totalCount ? (offset + limit) < totalCount : false

    return NextResponse.json({
      books: transformedBooks,
      hasMore,
      total: totalCount || 0
    })

  } catch (error) {
    console.error('Error in author books API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 