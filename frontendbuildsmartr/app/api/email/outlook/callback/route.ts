import { NextRequest, NextResponse } from "next/server"

// Database Backend URL
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7072"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Forward any errors from Microsoft
  if (error) {
    return NextResponse.redirect(`/account?error=outlook_auth_failed&message=${error}`)
  }

  if (!code) {
    return NextResponse.redirect('/account?error=outlook_auth_failed&message=missing_code')
  }

  try {
    const params = new URLSearchParams()
    params.set('code', code)
    if (state) params.set('state', state)

    // Call backend OAuth callback - it will return a redirect
    const response = await fetch(`${BACKEND_URL}/api/oauth/outlook/callback?${params.toString()}`, {
      redirect: "manual", // Don't follow redirects automatically
    })

    // If backend returns a redirect, forward it
    if (response.status === 302) {
      const location = response.headers.get("Location")
      if (location) {
        return NextResponse.redirect(location)
      }
    }

    // Handle error responses
    const data = await response.json().catch(() => ({ error: "OAuth callback failed" }))
    return NextResponse.json(data, { status: response.status })

  } catch (error) {
    console.error("[outlook/callback] OAuth error:", error)
    return NextResponse.redirect('/account?error=outlook_auth_failed&message=server_error')
  }
}
