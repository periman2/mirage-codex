import { NextRequest, NextResponse } from 'next/server'
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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    // If no profile exists, create one
    if (!profile) {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          display_name: user.email?.split('@')[0] || null,
          avatar_url: null,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating profile:', insertError)
        return NextResponse.json(
          { error: 'Failed to create profile' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        user_id: user.id,
        email: user.email,
        display_name: newProfile.display_name,
        avatar_url: newProfile.avatar_url,
        created_at: newProfile.created_at,
        updated_at: newProfile.updated_at,
      })
    }

    return NextResponse.json({
      user_id: user.id,
      email: user.email,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    })

  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const { display_name, avatar_url } = body

    // Validate input
    if (display_name !== undefined && (typeof display_name !== 'string' || display_name.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Display name must be a non-empty string' },
        { status: 400 }
      )
    }

    if (avatar_url !== undefined && avatar_url !== null && typeof avatar_url !== 'string') {
      return NextResponse.json(
        { error: 'Avatar URL must be a string or null' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (display_name !== undefined) {
      updateData.display_name = display_name.trim()
    }

    if (avatar_url !== undefined) {
      updateData.avatar_url = avatar_url
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      // If profile doesn't exist, create it
      if (updateError.code === 'PGRST116') {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            display_name: display_name?.trim() || user.email?.split('@')[0] || null,
            avatar_url: avatar_url || null,
          })
          .select()
          .single()

        if (insertError) {
          console.error('Error creating profile:', insertError)
          return NextResponse.json(
            { error: 'Failed to create profile' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          user_id: user.id,
          email: user.email,
          display_name: newProfile.display_name,
          avatar_url: newProfile.avatar_url,
          created_at: newProfile.created_at,
          updated_at: newProfile.updated_at,
        })
      }

      console.error('Error updating profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user_id: user.id,
      email: user.email,
      display_name: updatedProfile.display_name,
      avatar_url: updatedProfile.avatar_url,
      created_at: updatedProfile.created_at,
      updated_at: updatedProfile.updated_at,
    })

  } catch (error) {
    console.error('Profile update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 