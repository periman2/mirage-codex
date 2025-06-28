import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'
import axios from 'axios'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const bookId = params.id
    console.log('📚 Cover request for book ID:', bookId)

    // Create Supabase clients
    const supabase = await createSupabaseServerClient()
    const adminSupabase = createSupabaseAdminClient()

    // Get book details from database
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, title, cover_url, book_cover_prompt')
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

    // If cover URL already exists, redirect to it
    if (book.cover_url) {
      console.log('✅ Cover URL exists, building storage URL...')

      // Build the full URL using Supabase storage
      const { data: storageData } = adminSupabase.storage
        .from('book-covers')
        .getPublicUrl(book.cover_url)

      console.log('🔗 Redirecting to existing cover:', storageData.publicUrl)
      return NextResponse.redirect(storageData.publicUrl)
    }

    // No cover exists, generate one
    console.log('🎨 No cover found, generating new one...')

    if (!book.book_cover_prompt) {
      console.error('❌ No cover prompt available for book')
      return NextResponse.json(
        { error: 'No cover prompt available for this book' },
        { status: 400 }
      )
    }

    console.log('🔍 Segmind API Key available:', !!process.env.SEGMIND_API_KEY)

    if (!process.env.SEGMIND_API_KEY) {
      console.error('❌ SEGMIND_API_KEY not found in environment variables')
      return NextResponse.json(
        { error: 'Image generation service not configured' },
        { status: 500 }
      )
    }

    console.log('🤖 Generating image with Segmind Flux Juggernaut Lightning...')
    console.log('📝 Prompt:', book.book_cover_prompt)

    // Prepare payload for Segmind API - optimized for speed and efficiency
    // Using square format for better card layout
    const payload = {
      positivePrompt: book.book_cover_prompt,
      width: 512,
      height: 512,  // Square format
      steps: 8,
      seed: Math.floor(Math.random() * 2147483647),
      CFGScale: 7,
      outputFormat: "JPG",
      scheduler: "Euler"
    }

    console.log('⏳ Calling Segmind Flux Lightning API...')
    const response = await axios.post(
      'https://api.segmind.com/v1/juggernaut-lightning-flux',
      payload,
      {
        validateStatus: undefined,
        responseType: "arraybuffer",
        headers: {
          'x-api-key': process.env.SEGMIND_API_KEY,
          'Content-Type': 'application/json'
        },
      },
    )

    if (response.status !== 200) {
      console.error('❌ Segmind API error:', response.status)
      try {
        console.error('Error details:', Buffer.from(response.data).toString())
      } catch (e) {
        console.error('Could not parse error response')
      }
      return NextResponse.json(
        { error: 'Failed to generate cover image' },
        { status: 500 }
      )
    }

    console.log('✅ Image generated successfully with Segmind')
    const image = response.data

    // Upload to Supabase storage
    const fileName = `${bookId}.jpg`
    const imageFile = new File([image], fileName, { type: 'image/jpeg' })

    console.log('💾 Uploading to Supabase storage...')
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from('book-covers')
      .upload(fileName, imageFile, {
        contentType: 'image/jpeg',
        upsert: true // Overwrite if exists
      })

    if (uploadError) {
      console.error('❌ Failed to upload to storage:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload cover image' },
        { status: 500 }
      )
    }

    console.log('✅ Image uploaded to storage:', uploadData.path)

    // Update book record with cover URL (store relative path)
    const { error: updateError } = await adminSupabase
      .from('books')
      .update({ cover_url: uploadData.path })
      .eq('id', bookId)

    if (updateError) {
      console.error('❌ Failed to update book record:', updateError)
      // Continue anyway, we can still serve the image
    }

    // Build the public URL and redirect
    const { data: publicUrlData } = adminSupabase.storage
      .from('book-covers')
      .getPublicUrl(uploadData.path)

    console.log('🔗 Redirecting to new Segmind-generated cover:', publicUrlData.publicUrl)
    return NextResponse.redirect(publicUrlData.publicUrl)

  } catch (error) {
    console.error('💥 Cover generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 