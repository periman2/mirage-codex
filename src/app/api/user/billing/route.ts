import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Use the database function to get billing info with plan details
    const { data: billingInfo, error: billingError } = await supabase
      .rpc('get_user_billing_info', { p_user_id: user.id })

    if (billingError) {
      console.error('Error fetching billing info:', billingError)
      return NextResponse.json(
        { error: 'Failed to fetch billing information' },
        { status: 500 }
      )
    }

    if (!billingInfo || billingInfo.length === 0) {
      // Create default billing record if it doesn't exist
      const { error: insertError } = await supabase
        .from('user_billing')
        .insert({
          user_id: user.id,
          plan_id: 1, // Default to free plan
          credits: 50, // Default free plan credits
          plan_starts_at: new Date().toISOString(),
          plan_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          credits_used_this_month: 0,
        })

      if (insertError) {
        console.error('Error creating billing record:', insertError)
        return NextResponse.json(
          { error: 'Failed to create billing record' },
          { status: 500 }
        )
      }

      // Try again with the function
      const { data: newBillingInfo, error: newBillingError } = await supabase
        .rpc('get_user_billing_info', { p_user_id: user.id })
      
      if (newBillingError || !newBillingInfo || newBillingInfo.length === 0) {
        console.error('Error fetching new billing record:', newBillingError)
        return NextResponse.json(
          { error: 'Failed to fetch billing information' },
          { status: 500 }
        )
      }
      
      return NextResponse.json(newBillingInfo[0])
    }

    return NextResponse.json(billingInfo[0])

  } catch (error) {
    console.error('Billing API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT() {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // This endpoint would be used for plan changes in the future
    // For now, we'll just return a not implemented response
    return NextResponse.json(
      { error: 'Plan changes not yet implemented' },
      { status: 501 }
    )

  } catch (error) {
    console.error('Billing update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 