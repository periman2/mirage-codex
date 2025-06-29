import { useQuery } from '@tanstack/react-query'

interface BookEdition {
  id: string
  modelId: number
  modelName: string
}

interface BookData {
  id: string
  title: string
  summary: string
  pageCount: number
  coverUrl: string | null
  bookCoverPrompt: string | null
  author: {
    id: string
    penName: string
    bio: string | null
    stylePrompt: string | null
  }
  language: string
  genre: {
    id: string
    slug: string
    label: string
  }
  sections: Array<{
    title: string
    fromPage: number
    toPage: number
    summary: string
  }>
  editions: BookEdition[]
  stats: {
    likes: number
    views: number
  }
}

export function useBookData(bookId: string | undefined) {
  return useQuery<BookData>({
    queryKey: ['book', bookId],
    queryFn: async () => {
      if (!bookId) {
        throw new Error('Book ID is required')
      }

      const response = await fetch(`/api/book/${bookId}`)
      
      if (!response.ok) {
        throw new Error('Failed to load book')
      }

      return response.json()
    },
    enabled: !!bookId,
    staleTime: 0,
    refetchOnWindowFocus: false
  })
}

export type { BookData, BookEdition } 