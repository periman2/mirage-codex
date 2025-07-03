import { createSupabaseServerClient } from './supabase'
import { BookData } from '@/hooks/useBookData'

export async function fetchBookData(bookId: string): Promise<BookData | null> {
  try {
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
      .limit(1)
      .maybeSingle()

    if (bookError || !book) {
      console.error('❌ Book not found:', bookError)
      return null
    }

    // Get book sections
    const { data: sections, error: sectionsError } = await supabase
      .from('book_sections')
      .select('title, from_page, to_page, summary')
      .eq('book_id', bookId)
      .order('order_index')

    if (sectionsError) {
      console.error('❌ Failed to get sections:', sectionsError)
      return null
    }

    // Get all editions for this book
    const { data: editions, error: editionsError } = await supabase
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
      .order('created_at', { ascending: true }) // First edition will be the default

    if (editionsError || !editions || editions.length === 0) {
      console.error('❌ Failed to get editions:', editionsError)
      return null
    }

    // Format the response to match BookData interface
    const bookData: BookData = {
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
      editions: editions.map(edition => ({
        id: edition.id,
        modelId: edition.model_id,
        modelName: `${edition.models.model_domains.label} - ${edition.models.name}`
      })),
      stats: {
        likes: book.book_stats?.likes_cnt || 0,
        views: book.book_stats?.views_cnt || 0
      }
    }

    return bookData
  } catch (error) {
    console.error('💥 Book data fetch error:', error)
    return null
  }
} 