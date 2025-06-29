// Utility to transform book data from database format to UI format
export function transformBookWithStats(book: any) {
  if (!book) return null
  
  // Handle cases where book might be nested (like in search_books relation)
  const bookData = book.books || book
  
  return {
    id: bookData.id,
    title: bookData.title,
    summary: bookData.summary,
    pageCount: bookData.page_count,
    coverUrl: bookData.cover_url,
    bookCoverPrompt: bookData.book_cover_prompt,
    author: {
      id: bookData.authors?.id || bookData.author_id,
      penName: bookData.authors?.pen_name || bookData.author_pen_name,
      bio: bookData.authors?.bio || bookData.author_bio
    },
    language: bookData.languages?.label || bookData.language_code || 'Unknown',
    genre: {
      id: bookData.genres?.id || bookData.genre_id,
      slug: bookData.genres?.slug || bookData.genre_slug,
      label: bookData.genres?.label || bookData.genre_label
    },
    sections: bookData.sections || [],
    edition: {
      id: bookData.editions?.[0]?.id || bookData.edition_id,
      modelId: bookData.editions?.[0]?.model_id || bookData.model_id,
      modelName: bookData.editions?.[0]?.models?.name || bookData.model_name || 'Unknown Model'
    },
    stats: {
      likes: bookData.book_stats?.likes_cnt || 0,
      views: bookData.book_stats?.views_cnt || 0
    }
  }
} 