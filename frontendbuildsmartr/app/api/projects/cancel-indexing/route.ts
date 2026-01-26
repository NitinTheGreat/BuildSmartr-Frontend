import { createClient } from "@/utils/supabase/server"
import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7071"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("project_id")

  if (!projectId) {
    return NextResponse.json({ error: "project_id is required" }, { status: 400 })
  }

  try {
    console.log(`[cancel-indexing] Cancelling project: ${projectId}`)
    
    const response = await fetch(
      `${BACKEND_URL}/api/cancel_project_indexing?project_id=${encodeURIComponent(projectId)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    )

    const data = await response.json().catch(() => ({}))
    
    console.log(`[cancel-indexing] Response status: ${response.status}`, data)
    
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("[cancel-indexing] Error:", error)
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 })
  }
}
