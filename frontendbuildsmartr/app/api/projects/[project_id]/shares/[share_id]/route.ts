/*
 * SHARE PROJECT FEATURE - TEMPORARILY DISABLED
 * Uncomment to re-enable share API endpoints
 */

/*
import { createClient } from "@/utils/supabase/server"
import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7071"

interface RouteParams {
  params: Promise<{ project_id: string; share_id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { project_id, share_id } = await params

  try {
    const body = await request.json()
    const response = await fetch(`${BACKEND_URL}/api/projects/${project_id}/shares/${share_id}`, {
      method: "PUT",
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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { project_id, share_id } = await params

  try {
    const response = await fetch(`${BACKEND_URL}/api/projects/${project_id}/shares/${share_id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 })
  }
}
*/

// Placeholder exports - return 503 (feature disabled)
import { NextResponse } from "next/server"

export async function PUT() {
  return NextResponse.json({ error: "Share feature disabled" }, { status: 503 })
}

export async function DELETE() {
  return NextResponse.json({ error: "Share feature disabled" }, { status: 503 })
}
