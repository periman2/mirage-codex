import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createSearchHash, validateSearchParams } from '@/lib/hash'
import { generateBooks } from '@/lib/ai'
import { z } from 'zod'

const SearchRequestSchema = z.object({
  freeText: z.string().optional(),
  languageCode: z.string(),
  genreSlug: z.string(),
  tagSlugs: z.array(z.string()).default([]),
  modelName: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedInput = SearchRequestSchema.parse(body)
    
    // Validate search parameters
    const searchParams = validateSearchParams({
      freeText: validatedInput.freeText || null,
      languageCode: validatedInput.languageCode,
      genreSlug: validatedInput.genreSlug,
      tagSlugs: validatedInput.tagSlugs,
      modelName: validatedInput.modelName,
    })

    if (!searchParams) {
      return NextResponse.json(
        { error: 'Invalid search parameters' },
        { status: 400 }
      )
    }

    // Create deterministic hash
    const searchHash = createSearchHash(searchParams)
    
    const supabase = await createSupabaseServerClient()
    
    // Check if search already exists
    const { data: existingSearch } = await supabase
      .from('searches')
      .select(`
        id,
        search_books (
          book_id,
          rank,
          page_number,
          books (
            id,
            title,
            summary,
            page_count,
            cover_url,
            authors (
              pen_name,
              bio
            ),
            languages (
              code,
              label
            )
          )
        )
      `)
      .eq('hash', searchHash)
      .single()

    if (existingSearch) {
      // Return cached results
      const books = existingSearch.search_books
        .sort((a: any, b: any) => a.rank - b.rank)
        .map((sb: any) => ({
          id: sb.books.id,
          title: sb.books.title,
          summary: sb.books.summary,
          pageCount: sb.books.page_count,
          coverUrl: sb.books.cover_url,
          author: {
            penName: sb.books.authors.pen_name,
            bio: sb.books.authors.bio,
          },
          language: sb.books.languages.label,
        }))

      return NextResponse.json({
        searchId: existingSearch.id,
        books,
        cached: true,
      })
    }

    // Get user (if authenticated)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required for new searches' },
        { status: 401 }
      )
    }

    // Look up database IDs
    const { data: language } = await supabase
      .from('languages')
      .select('id')
      .eq('code', searchParams.languageCode)
      .single()

    const { data: genre } = await supabase
      .from('genres')
      .select('id, prompt_boost')
      .eq('slug', searchParams.genreSlug)
      .single()

    const { data: model } = await supabase
      .from('models')
      .select('id')
      .eq('name', searchParams.modelName)
      .single()

    if (!language || !genre || !model) {
      return NextResponse.json(
        { error: 'Invalid language, genre, or model' },
        { status: 400 }
      )
    }

    // Get tag prompts
    const { data: tags } = await supabase
      .from('tags')
      .select('prompt_boost')
      .in('slug', searchParams.tagSlugs)

    const tagPrompts = tags?.map(t => t.prompt_boost).filter(Boolean) || []

    // Check user credits (if not using BYO key)
    const { data: userBilling } = await supabase
      .from('user_billing')
      .select('credits')
      .eq('user_id', user.id)
      .single()

    // Check for BYO API key
    const { data: userApiKey } = await supabase
      .from('user_api_keys')
      .select('api_key_enc')
      .eq('user_id', user.id)
      .eq('domain_code', 'openai') // Simplified for demo
      .single()

    const hasApiKey = !!userApiKey
    const hasCredits = (userBilling?.credits || 0) >= 10 // Assume ~10 credits needed

    if (!hasApiKey && !hasCredits) {
      return NextResponse.json(
        { error: 'Insufficient credits and no API key configured' },
        { status: 402 }
      )
    }

    // Generate books using AI
    const generatedBooks = await generateBooks({
      freeText: searchParams.freeText,
      genrePrompt: genre.prompt_boost || `Generate ${searchParams.genreSlug} books`,
      tagPrompts,
      languageCode: searchParams.languageCode,
      modelName: searchParams.modelName,
    })

    // Insert search record
    const { data: newSearch, error: searchError } = await supabase
      .from('searches')
      .insert({
        hash: searchHash,
        user_id: user.id,
        language_id: language.id,
        genre_id: genre.id,
        model_id: model.id,
      })
      .select('id')
      .single()

    if (searchError || !newSearch) {
      throw new Error('Failed to create search record')
    }

    // Insert search params
    await supabase
      .from('search_params')
      .insert({
        search_id: newSearch.id,
        free_text: searchParams.freeText,
        tag_ids: searchParams.tagSlugs, // Simplified - should be UUIDs
      })

    // Insert authors and books
    const bookInserts: any[] = []
    const authorInserts: any[] = []
    const searchBookInserts: any[] = []

    for (let i = 0; i < generatedBooks.books.length; i++) {
      const book = generatedBooks.books[i]
      
      // Create author
      const authorId = crypto.randomUUID()
      authorInserts.push({
        id: authorId,
        pen_name: book.author.penName,
        style_prompt: book.author.stylePrompt,
        bio: book.author.bio,
      })

      // Create book
      const bookId = crypto.randomUUID()
      bookInserts.push({
        id: bookId,
        title: book.title,
        summary: book.summary,
        page_count: book.pageCount,
        author_id: authorId,
        primary_language_id: language.id,
      })

      // Link to search
      searchBookInserts.push({
        search_id: newSearch.id,
        book_id: bookId,
        rank: i + 1,
        page_number: 1, // First page
      })
    }

    // Insert all data
    await supabase.from('authors').insert(authorInserts)
    await supabase.from('books').insert(bookInserts)
    await supabase.from('search_books').insert(searchBookInserts)

    // Debit credits if not using BYO key
    if (!hasApiKey) {
      const totalPages = generatedBooks.books.reduce((sum, book) => sum + book.pageCount, 0)
      await supabase
        .from('user_billing')
        .update({ 
          credits: (userBilling?.credits || 0) - Math.ceil(totalPages / 10) // 1 credit per ~10 pages
        })
        .eq('user_id', user.id)
    }

    // Return results
    const books = generatedBooks.books.map((book, index) => ({
      id: bookInserts[index].id,
      title: book.title,
      summary: book.summary,
      pageCount: book.pageCount,
      coverUrl: null,
      author: {
        penName: book.author.penName,
        bio: book.author.bio,
      },
      language: searchParams.languageCode,
    }))

    return NextResponse.json({
      searchId: newSearch.id,
      books,
      cached: false,
    })

  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 