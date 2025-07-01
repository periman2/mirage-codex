import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'
import { getPageGenerationCreditCost } from '@/lib/credit-constants'

interface RouteParams {
  params: Promise<{
    id: string
    pageNumber: string
  }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { editionId, content } = await request.json()
    const { pageNumber } = await params
    
    console.log('💾 Saving page content:', { editionId, pageNumber })

    const supabase = await createSupabaseServerClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get edition details to determine model and check for user API key
    const { data: editionDetails, error: editionError } = await supabase
      .from('editions')
      .select(`
        model_id,
        books (title),
        models (domain_code)
      `)
      .eq('id', editionId)
      .single()

    if (editionError || !editionDetails) {
      console.error('❌ Edition not found:', editionError)
      return NextResponse.json(
        { error: 'Edition not found' },
        { status: 404 }
      )
    }

    // Check for BYO API key
    const { data: userApiKey } = await supabase
      .from('user_api_keys')
      .select('api_key_enc')
      .eq('user_id', user.id)
      .eq('domain_code', editionDetails.models.domain_code)
      .single()

    const hasApiKey = !!userApiKey
    console.log('🔑 User has API key:', hasApiKey)

    // Save the page content using admin client (required for RLS)
    const adminSupabase = createSupabaseAdminClient()
    const { error } = await adminSupabase
      .from('book_pages')
      .insert({
        edition_id: editionId,
        page_number: parseInt(pageNumber),
        content: content
      })

    if (error) {
      console.error('❌ Failed to save page:', error)
      return NextResponse.json(
        { error: 'Failed to save page content' },
        { status: 500 }
      )
    }

    console.log('✅ Page saved successfully')

    // Deduct credits only if page was saved successfully and user doesn't have BYO API key
    if (!hasApiKey) {
      const pageGenerationCreditCost = await getPageGenerationCreditCost(editionDetails.model_id)
      console.log(`💳 Deducting ${pageGenerationCreditCost} credits for saved page`)
      
      const { data: deductionSuccess, error: deductionError } = await supabase
        .rpc('deduct_user_credits', {
          p_user_id: user.id,
          p_credits_to_deduct: pageGenerationCreditCost,
          p_transaction_type: 'page_generation',
          p_description: `Generated page ${pageNumber} for "${editionDetails.books.title}"`
        })
      
      console.log('💳 Credit deduction result:', { deductionSuccess, deductionError })
      
      if (deductionError) {
        console.error('❌ Error deducting credits:', deductionError)
        // Don't fail the save since page is already saved - just log the issue
        console.log('⚠️ Page saved but credit deduction failed')
      } else if (!deductionSuccess) {
        console.log('⚠️ Page saved but credit deduction returned false')
      } else {
        console.log('✅ Credits deducted successfully after page save')
      }
    } else {
      console.log('⏭️ Skipping credit deduction (user has API key)')
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('💥 Save page error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 