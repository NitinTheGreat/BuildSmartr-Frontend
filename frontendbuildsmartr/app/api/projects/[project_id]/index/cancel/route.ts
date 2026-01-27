/**
 * Cancel Project Indexing API Route
 * Cancels an in-progress indexing operation via Database Backend
 */

import { createClient } from "@/utils/supabase/server"
import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7072"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ project_id: string }> }
) {
  const { project_id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Forward request to Database Backend's cancel endpoint
    const response = await fetch(`${BACKEND_URL}/api/projects/${project_id}/index/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    const data = await response.json().catch(() => ({}))

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("[projects/index/cancel] Error:", error)
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 })
  }
}
