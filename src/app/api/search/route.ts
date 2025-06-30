import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'
import { createSearchHash, validateSearchParams } from '@/lib/hash'
import { generateBooks, generateAuthors, determineGenreAndLanguage, PAGE_SIZE, AuthorSchema } from '@/lib/ai'
import { z } from 'zod'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database, Tables } from '@/lib/database.types'

// Use database types for better type safety

const SearchRequestSchema = z.object({
  freeText: z.string().optional(),
  languageCode: z.string().optional(),
  genreSlug: z.string().optional(),
  tagSlugs: z.array(z.string()).default([]),
  modelId: z.number(),
  pageNumber: z.number().min(1).default(1),
});


export const maxDuration = 60

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
  authors: Array<z.infer<typeof AuthorSchema>>,
  currentGenreSlug: string
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

  // Now assign genres to each author
  console.log('🎭 Assigning genres to authors...')
  
  // Get the current genre ID
  const { data: currentGenre } = await adminSupabase
    .from('genres')
    .select('id')
    .eq('slug', currentGenreSlug)
    .single()

  if (!currentGenre) {
    throw new Error(`Genre not found: ${currentGenreSlug}`)
  }

  // Get all available genres for random assignment
  const { data: allGenres } = await adminSupabase
    .from('genres')
    .select('id')
    .neq('id', currentGenre.id) // Exclude current genre since we'll add it separately

  const availableGenres = allGenres || []

  // Assign genres to each author
  for (const author of savedAuthors) {
    const genreAssignments = []
    
    // Always assign the current search genre
    genreAssignments.push({
      author_id: author.id,
      genre_id: currentGenre.id
    })

    // Randomly assign 0-5 additional genres
    const additionalGenreCount = Math.floor(Math.random() * 6) // 0-5
    console.log(`👤 ${author.pen_name}: Adding ${additionalGenreCount} additional genres`)

    if (additionalGenreCount > 0 && availableGenres.length > 0) {
      // Shuffle available genres and take the first N
      const shuffledGenres = [...availableGenres].sort(() => Math.random() - 0.5)
      const selectedGenres = shuffledGenres.slice(0, Math.min(additionalGenreCount, availableGenres.length))
      
      for (const genre of selectedGenres) {
        genreAssignments.push({
          author_id: author.id,
          genre_id: genre.id
        })
      }
    }

    // Insert genre assignments
    const { error: genreError } = await adminSupabase
      .from('author_genres')
      .insert(genreAssignments)

    if (genreError) {
      console.error(`❌ Failed to assign genres to author ${author.pen_name}:`, genreError)
      throw new Error(`Failed to assign genres to author: ${genreError.message}`)
    }

    console.log(`✅ Assigned ${genreAssignments.length} genres to ${author.pen_name}`)
  }
  
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
    
    // Create hash FIRST with user's original input (before AI determination)
    // This allows us to check cache before spending AI credits
    const originalSearchParams = {
      freeText: validatedInput.freeText?.trim() || null,
      languageCode: validatedInput.languageCode || null,
      genreSlug: validatedInput.genreSlug || null,
      tagSlugs: validatedInput.tagSlugs || [],
      modelId: validatedInput.modelId,
      pageNumber: validatedInput.pageNumber,
      pageSize: PAGE_SIZE,
      extraJson: null
    }
    
    const searchHash = createSearchHash(originalSearchParams)
    console.log('🔑 Generated hash from original input:', searchHash)
    
    const supabase = await createSupabaseServerClient()
    console.log('✅ Supabase client created')
    
    // Check if search results already exist for this hash BEFORE AI determination
    console.log('🔍 Checking for existing results...')
    const { data: existingResults } = await supabase
      .rpc('get_search_results', { p_hash: searchHash })

    console.log('📊 Existing results query result:', existingResults)

    if (existingResults && existingResults.length > 0) {
      console.log('💾 Found cached results, returning them - no AI credits used!')
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
        edition: {
          id: result.edition_id,
          modelId: result.model_id,
          modelName: result.model_name,
        },
      }))

      console.log('✅ Returning cached books:', books.length)
      return NextResponse.json({
        searchId: searchHash,
        books,
        cached: true,
      })
    }

    console.log('🆕 No cached results found, proceeding with AI determination...')
    
    // Determine genre and language if not provided (only for new searches)
    let finalGenreSlug = validatedInput.genreSlug
    let finalLanguageCode = validatedInput.languageCode

    console.log('🎯 Final determined values BEFORE AI:', { finalGenreSlug, finalLanguageCode })
    
    if ((!finalGenreSlug || !finalLanguageCode) && validatedInput.freeText) {
      console.log('🤖 Missing genre or language, using AI to determine both...')
      
      // Get available genres and languages for AI context
      const { data: availableGenres } = await supabase
        .from('genres')
        .select('slug, label')
        .eq('is_active', true)
        .order('label')
      
      const { data: availableLanguages } = await supabase
        .from('languages')
        .select('code, label')
        .order('label')
      
      if (!availableGenres || !availableLanguages) {
        console.error('❌ Failed to fetch genres or languages for AI determination')
        return NextResponse.json(
          { error: 'Failed to fetch available options for search' },
          { status: 500 }
        )
      }
      
      // Use AI to determine genre and language
      const { data: model } = await supabase
        .from('models')
        .select('name, domain_code')
        .eq('id', validatedInput.modelId)
        .single()
      
      if (!model) {
        console.error('❌ Model not found for AI determination')
        return NextResponse.json(
          { error: 'Invalid model' },
          { status: 400 }
        )
      }
      
      const determination = await determineGenreAndLanguage({
        freeText: validatedInput.freeText,
        availableGenres,
        availableLanguages,
        modelName: model.name,
        modelDomain: model.domain_code,
      })
      
      console.log('🎯 AI determined genre and language:', determination)
      
      // Use AI determined values or keep existing ones
      if(!finalGenreSlug){
        finalGenreSlug =  determination.genreSlug 
      }
      if(!finalLanguageCode){
        finalLanguageCode = determination.languageCode
      }
      console.log('🎯 Final determined values:', { finalGenreSlug, finalLanguageCode })
    }
    
    // Provide fallbacks if still not set
    finalLanguageCode = finalLanguageCode || 'en'
    finalGenreSlug = finalGenreSlug || 'fiction'
    
    console.log('🎯 Final determined values:', { finalGenreSlug, finalLanguageCode })
    
    // Create final search params for processing (but keep original hash)
    const finalSearchParams = {
      freeText: validatedInput.freeText?.trim() || null,
      languageCode: finalLanguageCode,
      genreSlug: finalGenreSlug,
      tagSlugs: validatedInput.tagSlugs,
      modelId: validatedInput.modelId,
      pageNumber: validatedInput.pageNumber,
      pageSize: PAGE_SIZE,
      extraJson: null
    }

    console.log('✅ Final search params for processing:', finalSearchParams)

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

    // Look up required data for AI generation using final determined values
    console.log('📚 Looking up genre and model data...')
    const { data: genre } = await supabase
      .from('genres')
      .select('prompt_boost')
      .eq('slug', finalGenreSlug)
      .single()

    console.log('📖 Genre data:', genre)

    const { data: model } = await supabase
      .from('models')
      .select('name, domain_code')
      .eq('id', finalSearchParams.modelId)
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
      .in('slug', finalSearchParams.tagSlugs)

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
      finalAuthors = await selectExistingAuthorsByGenre(supabase, finalGenreSlug, PAGE_SIZE)
    }
    
    // If we don't have enough authors, generate new ones
    if (finalAuthors.length < PAGE_SIZE) {
      const authorsNeeded = PAGE_SIZE - finalAuthors.length
      console.log(`🎨 Need to generate ${authorsNeeded} new authors`)
      
      // Generate new authors with retry logic
      console.log('🤖 Generating new authors...')
      const generatedAuthors = await generateAuthors({
        genrePrompt: genre.prompt_boost || `Generate authors for ${finalGenreSlug} genre`,
        languageCode: finalLanguageCode,
        modelName: model.name,
        modelDomain: model.domain_code,
        count: authorsNeeded,
      })

      console.log('✅ Authors generated successfully')

      // Save generated authors to database (this adds the random suffixes)
      const savedAuthors = await saveGeneratedAuthors(generatedAuthors, finalGenreSlug)
      
      // Combine existing and new authors
      finalAuthors = [...finalAuthors, ...savedAuthors]
    }

    console.log(`👥 Final author lineup: ${finalAuthors.length} authors`)
    console.log('👥 Author names:', finalAuthors.map(a => a.penName))

    // Generate new books using AI with the selected/generated authors
    console.log('🤖 Generating books with model:', model.name, 'for domain:', model.domain_code)
    console.log('🤖 Generation params:', {
      freeText: finalSearchParams.freeText,
      genrePrompt: genre.prompt_boost?.substring(0, 100) + '...',
      tagPrompts: tagPrompts.length,
      languageCode: finalLanguageCode,
      pageNumber: finalSearchParams.pageNumber,
      pageSize: finalSearchParams.pageSize,
      authorCount: finalAuthors.length
    })
    
    const generatedBooks = await generateBooks({
      freeText: finalSearchParams.freeText,
      genrePrompt: genre.prompt_boost || `Generate ${finalGenreSlug} books`,
      tagPrompts,
      languageCode: finalLanguageCode,
      modelName: model.name,
      modelDomain: model.domain_code,
      pageNumber: finalSearchParams.pageNumber,
      pageSize: finalSearchParams.pageSize,
      // Remove authorPenNames - we'll assign authors randomly after generation
    })

    console.log('✅ Books generated successfully:', generatedBooks.books.length)

    // Randomly assign authors to books
    console.log('🎲 Randomly assigning authors to books...')
    console.log('👥 Available authors:', finalAuthors.map(a => a.penName))
    
    // Shuffle authors to ensure random distribution
    const shuffledAuthors = [...finalAuthors].sort(() => Math.random() - 0.5)
    
    const booksWithAuthorIds = generatedBooks.books.map((book, index) => {
      // Cycle through shuffled authors if we have more books than authors
      const authorIndex = index % finalAuthors.length
      const assignedAuthor = shuffledAuthors[authorIndex]
      
      console.log(`📖 Assigned "${book.title}" to "${assignedAuthor.penName}"`)
      
      return {
        ...book,
        authorId: assignedAuthor.id,
        authorPenName: assignedAuthor.penName, // Set the author name for display
        bookCoverPrompt: book.bookCoverPrompt
      }
    })

    // Save results using Supabase function (atomic transaction) with original hash
    console.log('💾 Saving search results to database...')
    console.log('💾 Save params:', {
      hash: searchHash, // Use original hash from user input
      userId: user.id,
      freeText: finalSearchParams.freeText || '',
      languageCode: finalLanguageCode,
      genreSlug: finalGenreSlug,
      tagSlugs: finalSearchParams.tagSlugs,
      modelId: finalSearchParams.modelId,
      pageNumber: finalSearchParams.pageNumber,
      pageSize: finalSearchParams.pageSize,
      booksCount: booksWithAuthorIds.length
    })
    
    const { data: saveResult } = await supabase
      .rpc('save_search_results', {
        p_hash: searchHash, // Use original hash
        p_user_id: user.id,
        p_free_text: finalSearchParams.freeText || '',
        p_language_code: finalLanguageCode,
        p_genre_slug: finalGenreSlug,
        p_tag_slugs: finalSearchParams.tagSlugs,
        p_model_id: finalSearchParams.modelId,
        p_page_number: finalSearchParams.pageNumber,
        p_page_size: finalSearchParams.pageSize,
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
      edition: {
        id: result.edition_id,
        modelId: result.model_id,
        modelName: result.model_name,
      },
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