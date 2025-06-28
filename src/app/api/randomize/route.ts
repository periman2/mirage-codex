import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Call the efficient random book function
    const { data, error } = await supabase.rpc('get_random_book')
    
    if (error) {
      console.error('Error getting random book:', error)
      return NextResponse.json(
        { error: 'Failed to get random book' },
        { status: 500 }
      )
    }
    
    // If no book found
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No books available' },
        { status: 404 }
      )
    }
    
    const randomBook = data[0]
    
    // Format the response to match our SearchResultBook type
    const formattedBook = {
      id: randomBook.book_id,
      title: randomBook.book_title,
      summary: randomBook.book_summary,
      pageCount: randomBook.book_page_count,
      coverUrl: randomBook.book_cover_url,
      bookCoverPrompt: randomBook.book_cover_prompt,
      author: {
        id: randomBook.author_id,
        penName: randomBook.author_pen_name,
        bio: randomBook.author_bio
      },
      language: randomBook.language_code,
      genre: {
        slug: randomBook.genre_slug,
        label: randomBook.genre_label
      },
      sections: [], // We don't need sections for randomizer
      edition: {
        id: randomBook.edition_id,
        modelId: randomBook.model_id,
        modelName: randomBook.model_name
      }
    }
    
    return NextResponse.json({
      success: true,
      book: formattedBook
    })
    
  } catch (error) {
    console.error('Unexpected error in randomize endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 