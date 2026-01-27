import { NextResponse } from "next/server"

// Database Backend URL
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7072"

export async function GET() {
  try {
    // Call backend OAuth endpoint - it will return a redirect URL
    const response = await fetch(`${BACKEND_URL}/api/oauth/outlook`, {
      redirect: "manual", // Don't follow redirects automatically
    })

    // If backend returns a redirect, forward it to the client
    if (response.status === 302) {
      const location = response.headers.get("Location")
      if (location) {
        return NextResponse.redirect(location)
      }
    }

    // Handle error responses
    const data = await response.json().catch(() => ({ error: "OAuth initiation failed" }))
    return NextResponse.json(data, { status: response.status })
    
  } catch (error) {
    console.error("[outlook/route] OAuth error:", error)
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 })
  }
}
