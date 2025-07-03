import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchBookData } from '@/lib/book-utils'
import BookDetailClient from './BookDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// Generate metadata for social sharing
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  try {
    const { id: bookId } = await params
    const searchParamsResolved = await searchParams
    const page = searchParamsResolved.page ? parseInt(searchParamsResolved.page as string) : 1
    
    // Fetch book data using the shared utility
    const book = await fetchBookData(bookId)

    if (!book) {
      return {
        title: 'Book Not Found - MirageCodex',
        description: 'The requested book could not be found.',
      }
    }

    const title = page > 1 
      ? `${book.title} - Page ${page} - MirageCodex`
      : `${book.title} - MirageCodex`
    
    const description = book.summary || `Discover "${book.title}" by ${book.author.penName} in the ${book.genre.label} genre on MirageCodex.`
    
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://miragecodex.com'
    const coverImageUrl = `${baseUrl}/api/book/${bookId}/cover`

    return {
      metadataBase: new URL(baseUrl),
      title,
      description,
      keywords: [
        'AI books',
        'fiction',
        'literature',
        book.genre.label,
        book.author.penName,
        'MirageCodex'
      ],
      authors: [{ name: book.author.penName }],
      openGraph: {
        title,
        description,
        type: 'article',
        url: `${baseUrl}/book/${bookId}${page > 1 ? `?page=${page}` : ''}`,
        images: [
          {
            url: coverImageUrl,
            width: 512,
            height: 512,
            alt: `Cover of ${book.title}`,
          }
        ],
        siteName: 'MirageCodex',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [coverImageUrl],
        creator: '@MirageCodex',
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'MirageCodex - The Infinite AI-Generated Library',
      description: 'Discover and create infinite stories with AI.',
    }
  }
}

export default async function BookDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  
  // Fetch complete book data server-side
  const book = await fetchBookData(id)

  if (!book) {
    notFound()
  }

  // Render the client component with the book data
  return <BookDetailClient bookId={id} initialBookData={book} />
} 