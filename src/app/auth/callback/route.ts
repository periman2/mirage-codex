import { createSupabaseServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  console.log('Auth callback received:', { code: code ? 'present' : 'missing', origin, next })

  if (code) {
    try {
      const supabase = await createSupabaseServerClient()
      console.log('Attempting to exchange code for session...')
      
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Code exchange error:', error)
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error.message)}`)
      }

      if (data.session) {
        console.log('Session created successfully for user:', data.user?.email)
        
        const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
        const isLocalEnv = process.env.NODE_ENV === 'development'
        if (isLocalEnv) {
          // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
          return NextResponse.redirect(`${origin}${next}`)
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`)
        } else {
          return NextResponse.redirect(`${origin}${next}`)
        }
      } else {
        console.error('No session created despite no error')
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no_session`)
      }
    } catch (error) {
      console.error('Unexpected error during code exchange:', error)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=unexpected`)
    }
  }

  console.error('No code provided in callback')
  return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no_code`)
} 