import { createClient } from "@/utils/supabase/server"
import { NextRequest, NextResponse } from "next/server"

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || process.env.NEXT_PUBLIC_AI_BACKEND_URL || "http://localhost:7071"
const AZURE_FUNCTION_KEY = process.env.AZURE_FUNCTION_KEY || ""

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { project_id, question, top_k = 50 } = body

    if (!project_id || !question) {
      return NextResponse.json(
        { error: "project_id and question are required" },
        { status: 400 }
      )
    }

    const response = await fetch(`${AI_BACKEND_URL}/api/search_project_stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-functions-key": AZURE_FUNCTION_KEY,
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        project_id,
        question,
        top_k,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error")
      return NextResponse.json(
        { error: `Search failed: ${response.status} ${errorText}` },
        { status: response.status }
      )
    }

    if (!response.body) {
      return NextResponse.json(
        { error: "No response body available for streaming" },
        { status: 500 }
      )
    }

    // Stream the SSE response through to the client
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backend unavailable" },
      { status: 503 }
    )
  }
}
