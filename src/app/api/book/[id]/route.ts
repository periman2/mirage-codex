import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: bookId } = await params
    console.log('📚 Book details request for ID:', bookId)

    const supabase = await createSupabaseServerClient()

    // Get book details with author, sections, genre, edition, and stats information
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select(`
        id,
        title,
        summary,
        page_count,
        cover_url,
        book_cover_prompt,
        primary_language_id,
        genre_id,
        authors (
          id,
          pen_name,
          bio,
          style_prompt
        ),
        languages!books_primary_language_id_fkey (
          code,
          label
        ),
        genres (
          id,
          slug,
          label
        ),
        book_stats (
          likes_cnt,
          views_cnt
        )
      `)
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      console.error('❌ Book not found:', bookError)
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      )
    }

    console.log('📖 Book found:', book.title)

    // Get book sections
    const { data: sections, error: sectionsError } = await supabase
      .from('book_sections')
      .select('title, from_page, to_page, summary')
      .eq('book_id', bookId)
      .order('order_index')

    if (sectionsError) {
      console.error('❌ Failed to get sections:', sectionsError)
      return NextResponse.json(
        { error: 'Failed to get book sections' },
        { status: 500 }
      )
    }

    // Get edition information (first available edition for this book)
    const { data: edition, error: editionError } = await supabase
      .from('editions')
      .select(`
        id,
        model_id,
        models (
          name,
          model_domains (
            label
          )
        )
      `)
      .eq('book_id', bookId)
      .limit(1)
      .single()

    if (editionError) {
      console.error('❌ Failed to get edition:', editionError)
      return NextResponse.json(
        { error: 'Failed to get book edition' },
        { status: 500 }
      )
    }

    // Format the response
    const bookData = {
      id: book.id,
      title: book.title,
      summary: book.summary,
      pageCount: book.page_count,
      coverUrl: book.cover_url,
      bookCoverPrompt: book.book_cover_prompt,
      author: {
        id: book.authors.id,
        penName: book.authors.pen_name,
        bio: book.authors.bio,
        stylePrompt: book.authors.style_prompt
      },
      language: book.languages.label,
      genre: {
        id: book.genres.id,
        slug: book.genres.slug,
        label: book.genres.label
      },
      sections: sections?.map(section => ({
        title: section.title,
        fromPage: section.from_page,
        toPage: section.to_page,
        summary: section.summary
      })) || [],
      edition: {
        id: edition.id,
        modelId: edition.model_id,
        modelName: `${edition.models.model_domains.label} - ${edition.models.name}`
      },
      stats: {
        likes: book.book_stats?.likes_cnt || 0,
        views: book.book_stats?.views_cnt || 0
      }
    }

    console.log('✅ Returning book data')
    return NextResponse.json(bookData)

  } catch (error) {
    console.error('💥 Book details error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 