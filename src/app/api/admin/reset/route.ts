import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Security check: Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      console.log('❌ Reset attempt blocked: Not in development mode')
      return NextResponse.json(
        { error: 'This endpoint is only available in development mode' },
        { status: 403 }
      )
    }

    // Security check: Only allow localhost requests
    const host = request.headers.get('host')
    const isLocalhost = host?.includes('localhost') || host?.includes('127.0.0.1')
    
    if (!isLocalhost) {
      console.log('❌ Reset attempt blocked: Not localhost request')
      return NextResponse.json(
        { error: 'This endpoint is only available on localhost' },
        { status: 403 }
      )
    }

    console.log('🗑️ Starting database reset...')
    
    const adminSupabase = createSupabaseAdminClient()

    // Delete all books (this will cascade to book_sections due to foreign key)
    console.log('📚 Deleting all books...')
    const { error: booksError } = await adminSupabase
      .from('books')
      .delete()
      .gte('created_at', '1970-01-01') // Delete all records (all dates >= epoch)

    if (booksError) {
      console.error('❌ Failed to delete books:', booksError)
      throw new Error(`Failed to delete books: ${booksError.message}`)
    }

    // Delete all searches (this will cascade to search_books due to foreign key)
    console.log('🔍 Deleting all searches...')
    const { error: searchesError } = await adminSupabase
      .from('searches')
      .delete()
      .gte('created_at', '1970-01-01') // Delete all records (all dates >= epoch)

    if (searchesError) {
      console.error('❌ Failed to delete searches:', searchesError)
      throw new Error(`Failed to delete searches: ${searchesError.message}`)
    }

    // Delete all authors (optional - you might want to keep them)
    console.log('👥 Deleting all authors...')
    const { error: authorsError } = await adminSupabase
      .from('authors')
      .delete()
      .gte('created_at', '1970-01-01') // Delete all records (all dates >= epoch)

    if (authorsError) {
      console.error('❌ Failed to delete authors:', authorsError)
      throw new Error(`Failed to delete authors: ${authorsError.message}`)
    }

    // Clear book covers from storage
    console.log('🖼️ Clearing book covers from storage...')
    const { data: files } = await adminSupabase.storage
      .from('book-covers')
      .list()

    if (files && files.length > 0) {
      const filePaths = files.map(file => file.name)
      const { error: storageError } = await adminSupabase.storage
        .from('book-covers')
        .remove(filePaths)

      if (storageError) {
        console.error('❌ Failed to clear storage:', storageError)
        // Don't throw here, storage cleanup is not critical
      } else {
        console.log(`✅ Cleared ${filePaths.length} cover images from storage`)
      }
    }

    console.log('✅ Database reset completed successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Database reset completed successfully'
    })

  } catch (error) {
    console.error('💥 Reset error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 