import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'
import { createSearchHash, validateSearchParams } from '@/lib/hash'
import { generateBooks, generateAuthors, PAGE_SIZE, AuthorSchema } from '@/lib/ai'
import { z } from 'zod'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database, Tables } from '@/lib/database.types'

// Use database types for better type safety

const SearchRequestSchema = z.object({
  freeText: z.string().optional(),
  languageCode: z.string(),
  genreSlug: z.string(),
  tagSlugs: z.array(z.string()).default([]),
  modelId: z.number(),
  pageNumber: z.number().min(1).default(1),
});

/**
 * Select random existing authors who have written in this genre
 */
async function selectExistingAuthorsByGenre(
  supabase: SupabaseClient<Database>,
  genreSlug: string,
  count: number
): Promise<Array<{ id: string; penName: string; stylePrompt: string; bio: string }>> {
  console.log(`🎲 Selecting up to ${count} existing authors for genre: ${genreSlug}`)
  
  const { data: authors } = await supabase
    .rpc('get_random_authors_by_genre', {
      p_genre_slug: genreSlug,
      p_limit: count
    })

  console.log(`📚 Found ${authors?.length || 0} existing authors for genre`)
  
  // Map the database result to our expected format
  return (authors || []).map(author => ({
    id: author.id,
    penName: author.pen_name,
    stylePrompt: author.style_prompt || '',
    bio: author.bio || ''
  }))
}

/**
 * Save generated authors to database with random suffixes
 */
async function saveGeneratedAuthors(
  authors: Array<z.infer<typeof AuthorSchema>>
): Promise<Array<{ id: string; penName: string; stylePrompt: string; bio: string }>> {
  console.log('💾 Saving generated authors to database...')
  
  // Use admin client for author operations (requires service role)
  const adminSupabase = createSupabaseAdminClient()
  
  // Add random suffixes to pen names to avoid duplicates
  const authorsWithSuffixes = authors.map(author => ({
    ...author,
    penName: `${author.penName} - ${Math.floor(Math.random() * 100000)}`
  }))

  console.log('📝 Authors with suffixes:', authorsWithSuffixes.map(a => a.penName))

  const { data: savedAuthors, error } = await adminSupabase
    .from('authors')
    .insert(authorsWithSuffixes.map((author: { penName: string; stylePrompt: string; bio: string }) => ({
      pen_name: author.penName,
      style_prompt: author.stylePrompt,
      bio: author.bio
    })))
    .select('id, pen_name, style_prompt, bio')

  if (error) {
    console.error('❌ Failed to save authors:', error)
    throw new Error(`Failed to save authors: ${error.message}`)
  }

  console.log(`✅ Saved ${savedAuthors.length} authors to database`)
  
  return savedAuthors.map((author: any) => ({
    id: author.id,
    penName: author.pen_name,
    stylePrompt: author.style_prompt,
    bio: author.bio
  }))
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Search API called')
    
    const body = await request.json()
    console.log('📝 Request body:', JSON.stringify(body, null, 2))
    
    const validatedInput = SearchRequestSchema.parse(body)
    console.log('✅ Input validated:', validatedInput)
    
    // Validate search parameters
    const searchParams = validateSearchParams({
      freeText: validatedInput.freeText || null,
      languageCode: validatedInput.languageCode,
      genreSlug: validatedInput.genreSlug,
      tagSlugs: validatedInput.tagSlugs,
      modelId: validatedInput.modelId,
      pageNumber: validatedInput.pageNumber,
      pageSize: PAGE_SIZE, // Server-controlled page size
    })

    if (!searchParams) {
      console.log('❌ Invalid search parameters')
      return NextResponse.json(
        { error: 'Invalid search parameters' },
        { status: 400 }
      )
    }

    console.log('✅ Search params validated:', searchParams)

    // Create deterministic hash (includes pagination)
    const searchHash = createSearchHash(searchParams)
    console.log('🔑 Generated hash:', searchHash)
    
    const supabase = await createSupabaseServerClient()
    console.log('✅ Supabase client created')
    
    // Check if search results already exist for this hash
    console.log('🔍 Checking for existing results...')
    const { data: existingResults } = await supabase
      .rpc('get_search_results', { p_hash: searchHash })

    console.log('📊 Existing results query result:', existingResults)

    if (existingResults && existingResults.length > 0) {
      console.log('💾 Found cached results, returning them')
      // Return cached results
      const books = existingResults.map((result: any) => ({
        id: result.book_id,
        title: result.book_title,
        summary: result.book_summary,
        pageCount: result.book_page_count,
        coverUrl: result.book_cover_url,
        bookCoverPrompt: result.book_cover_prompt,
        author: {
          id: result.author_id,
          penName: result.author_pen_name,
          bio: result.author_bio,
        },
        language: result.language_code,
        sections: result.book_sections || [],
      }))

      console.log('✅ Returning cached books:', books.length)
      return NextResponse.json({
        searchId: searchHash,
        books,
        cached: true,
      })
    }

    console.log('🆕 No cached results found, generating new books')

    // Get user (if authenticated)
    console.log('👤 Getting user authentication...')
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.log('❌ No authenticated user found')
      return NextResponse.json(
        { error: 'Authentication required for new searches' },
        { status: 401 }
      )
    }

    console.log('✅ User authenticated:', user.id)

    // Look up required data for AI generation
    console.log('📚 Looking up genre and model data...')
    const { data: genre } = await supabase
      .from('genres')
      .select('prompt_boost')
      .eq('slug', searchParams.genreSlug)
      .single()

    console.log('📖 Genre data:', genre)

    const { data: model } = await supabase
      .from('models')
      .select('name, domain_code')
      .eq('id', searchParams.modelId)
      .single()

    console.log('🤖 Model data:', model)

    if (!genre || !model) {
      console.log('❌ Invalid genre or model')
      return NextResponse.json(
        { error: 'Invalid genre or model' },
        { status: 400 }
      )
    }

    // Get tag prompts
    console.log('🏷️ Looking up tag prompts...')
    const { data: tags } = await supabase
      .from('tags')
      .select('prompt_boost')
      .in('slug', searchParams.tagSlugs)

    console.log('🏷️ Tags data:', tags)
    const tagPrompts = tags?.map(t => t.prompt_boost).filter((prompt): prompt is string => Boolean(prompt)) || []
    console.log('🏷️ Tag prompts:', tagPrompts)

    // Check user credits (if not using BYO key)
    console.log('💳 Checking user billing...')
    const { data: userBilling } = await supabase
      .from('user_billing')
      .select('credits')
      .eq('user_id', user.id)
      .single()

    console.log('💳 User billing:', userBilling)

    // Check for BYO API key
    console.log('🔑 Checking for user API key...')
    const { data: userApiKey } = await supabase
      .from('user_api_keys')
      .select('api_key_enc')
      .eq('user_id', user.id)
      .eq('domain_code', model.domain_code)
      .single()

    console.log('🔑 User API key found:', !!userApiKey)

    const hasApiKey = !!userApiKey
    const hasCredits = (userBilling?.credits || 0) >= 10 // Assume ~10 credits needed

    console.log('💰 Credit check - hasApiKey:', hasApiKey, 'hasCredits:', hasCredits, 'credits:', userBilling?.credits)

    if (!hasApiKey && !hasCredits) {
      console.log('❌ Insufficient credits and no API key')
      return NextResponse.json(
        { error: 'Insufficient credits and no API key configured' },
        { status: 402 }
      )
    }

    // NEW AUTHOR SELECTION/GENERATION LOGIC
    console.log('👥 Starting author selection/generation process...')
    
    // Roll the dice - 50% chance to try existing authors
    const shouldTryExistingAuthors = Math.random() < 0.5
    console.log('🎲 Dice roll for existing authors:', shouldTryExistingAuthors)
    
    let finalAuthors: Array<{ id: string; penName: string; stylePrompt: string; bio: string }> = []
    
    if (shouldTryExistingAuthors) {
      console.log('🔍 Attempting to use existing authors...')
      finalAuthors = await selectExistingAuthorsByGenre(supabase, searchParams.genreSlug, PAGE_SIZE)
    }
    
    // If we don't have enough authors, generate new ones
    if (finalAuthors.length < PAGE_SIZE) {
      const authorsNeeded = PAGE_SIZE - finalAuthors.length
      console.log(`🎨 Need to generate ${authorsNeeded} new authors`)
      
      // Generate new authors with retry logic
      console.log('🤖 Generating new authors...')
      const generatedAuthors = await generateAuthors({
        genrePrompt: genre.prompt_boost || `Generate authors for ${searchParams.genreSlug} genre`,
        languageCode: searchParams.languageCode,
        modelName: model.name,
        modelDomain: model.domain_code,
        count: authorsNeeded,
      })

      console.log('✅ Authors generated successfully')

      // Save generated authors to database (this adds the random suffixes)
      const savedAuthors = await saveGeneratedAuthors(generatedAuthors)
      
      // Combine existing and new authors
      finalAuthors = [...finalAuthors, ...savedAuthors]
    }

    console.log(`👥 Final author lineup: ${finalAuthors.length} authors`)
    console.log('👥 Author names:', finalAuthors.map(a => a.penName))

    // Generate new books using AI with the selected/generated authors
    console.log('🤖 Generating books with model:', model.name, 'for domain:', model.domain_code)
    console.log('🤖 Generation params:', {
      freeText: searchParams.freeText,
      genrePrompt: genre.prompt_boost?.substring(0, 100) + '...',
      tagPrompts: tagPrompts.length,
      languageCode: searchParams.languageCode,
      pageNumber: searchParams.pageNumber,
      pageSize: searchParams.pageSize,
      authorCount: finalAuthors.length
    })
    
    const generatedBooks = await generateBooks({
      freeText: searchParams.freeText,
      genrePrompt: genre.prompt_boost || `Generate ${searchParams.genreSlug} books`,
      tagPrompts,
      languageCode: searchParams.languageCode,
      modelName: model.name,
      modelDomain: model.domain_code,
      pageNumber: searchParams.pageNumber,
      pageSize: searchParams.pageSize,
      authorPenNames: finalAuthors.map(a => a.penName),
    })

    console.log('✅ Books generated successfully:', generatedBooks.books.length)

    // Debug: Log what author names the AI returned
    console.log('📚 AI returned books with authors:', generatedBooks.books.map(b => b.authorPenName))
    console.log('👥 Available authors we have:', finalAuthors.map(a => a.penName))

    // Map books to include author IDs for database saving
    const booksWithAuthorIds = generatedBooks.books.map(book => {
      // First try exact match
      let author = finalAuthors.find(a => a.penName === book.authorPenName)
      
      // If exact match fails, try to find by base name (without suffix)
      if (!author) {
        console.log(`🔍 Exact match failed for "${book.authorPenName}", trying base name match...`)
        author = finalAuthors.find(a => {
          // Extract base name by removing the " - [number]" suffix
          const baseName = a.penName.replace(/ - \d+$/, '')
          return baseName === book.authorPenName
        })
      }
      
      if (!author) {
        console.error('❌ Available authors:', finalAuthors.map(a => a.penName))
        console.error('❌ Looking for:', book.authorPenName)
        throw new Error(`Author not found for pen name: ${book.authorPenName}`)
      }
      
      console.log(`✅ Matched "${book.authorPenName}" to "${author.penName}"`)
      return {
        ...book,
        authorId: author.id,
        bookCoverPrompt: book.bookCoverPrompt
      }
    })

    // Save results using Supabase function (atomic transaction)
    console.log('💾 Saving search results to database...')
    console.log('💾 Save params:', {
      hash: searchHash,
      userId: user.id,
      freeText: searchParams.freeText || '',
      languageCode: searchParams.languageCode,
      genreSlug: searchParams.genreSlug,
      tagSlugs: searchParams.tagSlugs,
      modelId: searchParams.modelId,
      pageNumber: searchParams.pageNumber,
      pageSize: searchParams.pageSize,
      booksCount: booksWithAuthorIds.length
    })
    
    const { data: saveResult } = await supabase
      .rpc('save_search_results', {
        p_hash: searchHash,
        p_user_id: user.id,
        p_free_text: searchParams.freeText || '',
        p_language_code: searchParams.languageCode,
        p_genre_slug: searchParams.genreSlug,
        p_tag_slugs: searchParams.tagSlugs,
        p_model_id: searchParams.modelId,
        p_page_number: searchParams.pageNumber,
        p_page_size: searchParams.pageSize,
        p_books: booksWithAuthorIds,
      })

    console.log('💾 Save result:', saveResult)

    if (!(saveResult as any)?.success) {
      console.error('❌ Failed to save search results:', saveResult)
      return NextResponse.json(
        { error: 'Failed to save search results' },
        { status: 500 }
      )
    }

    console.log('✅ Search results saved successfully')

    // Calculate total pages for credit deduction
    const totalPages = generatedBooks.books.reduce((sum, book) => sum + book.pageCount, 0)
    console.log('📊 Total pages generated:', totalPages)

    // Deduct credits if not using BYO key
    if (!hasApiKey && hasCredits) {
      const creditsToDeduct = Math.ceil(totalPages / 10)
      console.log('💳 Deducting credits:', creditsToDeduct, 'from', userBilling?.credits)
      
      await supabase
        .from('user_billing')
        .update({ 
          credits: (userBilling?.credits || 0) - creditsToDeduct // 1 credit per ~10 pages //TODO: improve this
        })
        .eq('user_id', user.id)
      
      console.log('✅ Credits deducted successfully')
    } else {
      console.log('⏭️ Skipping credit deduction (using API key or no credits)')
    }

    // Retrieve the saved results to get proper IDs
    console.log('🔄 Retrieving saved results with proper IDs...')
    const { data: savedResults } = await supabase
      .rpc('get_search_results', { p_hash: searchHash })

    console.log('📋 Retrieved saved results:', savedResults?.length || 0)

    if (!savedResults || savedResults.length === 0) {
      console.error('❌ Failed to retrieve saved search results')
      throw new Error('Failed to retrieve saved search results')
    }

    // Return the saved books with proper IDs
    const books = savedResults.map((result: any) => ({
      id: result.book_id,
      title: result.book_title,
      summary: result.book_summary,
      pageCount: result.book_page_count,
      coverUrl: result.book_cover_url,
      bookCoverPrompt: result.book_cover_prompt,
      author: {
        id: result.author_id,
        penName: result.author_pen_name,
        bio: result.author_bio,
      },
      language: result.language_code,
      sections: result.book_sections || [],
    }))

    console.log('✅ Returning generated books:', books.length)
    return NextResponse.json({
      searchId: searchHash,
      books,
      cached: false,
    })

  } catch (error) {
    console.error('💥 Search API error:', error)
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 