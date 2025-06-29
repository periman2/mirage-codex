import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'
import { createHash } from 'crypto'
import axios from 'axios'

interface RouteParams {
  params: Promise<{
    id: string
    pageNumber: string
  }>
}

export const maxDuration = 60

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: bookId, pageNumber } = await params
    const { searchParams } = new URL(request.url)
    const prompt = searchParams.get('prompt')
    const editionId = searchParams.get('edition')

    console.log('🖼️ Page image request for book:', bookId, 'page:', pageNumber, 'edition:', editionId)

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt parameter is required' },
        { status: 400 }
      )
    }

    if (!editionId) {
      return NextResponse.json(
        { error: 'Edition parameter is required' },
        { status: 400 }
      )
    }

    // Create hash from book_id + edition_id + page_number + prompt
    const hashString = `${bookId}:${editionId}:${pageNumber}:${prompt}`
    const hash = createHash('sha256').update(hashString).digest('hex')

    console.log('🔍 Generated hash:', hash)

    // Create admin Supabase client
    const adminSupabase = createSupabaseAdminClient()

    // Check if image already exists
    const { data: existingImage, error: checkError } = await adminSupabase
      .from('book_page_images')
      .select('image_url')
      .eq('hash', hash)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing image:', checkError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    // If image exists, redirect to it
    if (existingImage?.image_url) {
      console.log('✅ Image exists, redirecting to:', existingImage.image_url)

      // Build the full URL using Supabase storage
      const { data: storageData } = adminSupabase.storage
        .from('page-images')
        .getPublicUrl(existingImage.image_url)

      return NextResponse.redirect(storageData.publicUrl)
    }

    // No image exists, check authentication before generating
    console.log('🎨 No image found, checking authentication before generating...')
    
    // Create Supabase client for auth check
    const supabase = await createSupabaseServerClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('🚫 Unauthorized image generation attempt')
      return NextResponse.json(
        { error: 'Authentication required to generate images' },
        { status: 401 }
      )
    }

    console.log('✅ Authenticated user:', user.email, 'requesting image generation')
    console.log('📝 Prompt:', prompt)

    if (!process.env.SEGMIND_API_KEY) {
      console.error('❌ SEGMIND_API_KEY not found in environment variables')
      return NextResponse.json(
        { error: 'Image generation service not configured' },
        { status: 500 }
      )
    }

    console.log('🤖 Generating image with Segmind Flux...')

    // Prepare payload for Segmind API - optimized for contextual page images
    const payload = {
      positivePrompt: `${prompt}, high quality, detailed, artistic, book illustration style`,
      width: 768,
      height: 512,  // Landscape format for page images
      steps: 4,
      seed: Math.floor(Math.random() * 2147483647),
      CFGScale: 7,
      outputFormat: "JPG",
      scheduler: "Euler"
    }

    console.log('⏳ Calling Segmind Flux API...')
    const response = await axios.post(
      'https://api.segmind.com/v1/fast-flux-schnell',
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
        { error: 'Failed to generate page image' },
        { status: 500 }
      )
    }

    console.log('✅ Image generated successfully with Segmind')
    const image = response.data

    // Upload to Supabase storage
    const fileName = `${bookId}_${editionId}_page${pageNumber}_${hash.substring(0, 8)}.jpg`
    const imageFile = new File([image], fileName, { type: 'image/jpeg' })

    console.log('💾 Uploading to Supabase storage...')
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from('page-images')
      .upload(fileName, imageFile, {
        contentType: 'image/jpeg',
        upsert: true // Overwrite if exists
      })

    if (uploadError) {
      console.error('❌ Failed to upload to storage:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload page image' },
        { status: 500 }
      )
    }

    console.log('✅ Image uploaded to storage:', uploadData.path)

    // Save record to database
    const { error: insertError } = await adminSupabase
      .from('book_page_images')
      .insert({
        edition_id: editionId,
        page_number: parseInt(pageNumber),
        prompt_text: prompt,
        image_url: uploadData.path,
        hash: hash,
        data: {
          original_prompt: prompt,
          enhanced_prompt: payload.positivePrompt,
          generation_params: {
            width: payload.width,
            height: payload.height,
            steps: payload.steps,
            seed: payload.seed,
            cfg_scale: payload.CFGScale
          }
        }
      })

    if (insertError) {
      console.error('❌ Failed to save image record:', insertError)
      // Continue anyway, we can still serve the image
    }

    // Build the public URL and redirect
    const { data: publicUrlData } = adminSupabase.storage
      .from('page-images')
      .getPublicUrl(uploadData.path)

    console.log('🔗 Redirecting to new generated page image:', publicUrlData.publicUrl)
    return NextResponse.redirect(publicUrlData.publicUrl)

  } catch (error) {
    console.error('💥 Page image generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 