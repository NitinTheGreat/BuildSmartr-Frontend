import { createClient } from "@/utils/supabase/server"
import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7071"

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    console.log("[api/projects] No session or access token")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log("[api/projects] Calling backend with token:", session.access_token.substring(0, 50) + "...")

  try {
    const response = await fetch(`${BACKEND_URL}/api/projects`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })
    const data = await response.json().catch(() => ({}))
    console.log("[api/projects] Backend response:", response.status, data)
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("[api/projects] Error:", error)
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const response = await fetch(`${BACKEND_URL}/api/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 })
  }
}
