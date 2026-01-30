import { NextRequest, NextResponse } from "next/server"

// Database Backend URL
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7072"

/**
 * GET /api/segments
 * List all trade segments grouped by phase
 * NOTE: This is a PUBLIC endpoint - no auth required
 */
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/segments`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Cache for 5 minutes since segments rarely change
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("[segments] Backend error:", error)
      return NextResponse.json({ error: "Failed to fetch segments" }, { status: response.status })
    }

    // Backend returns {phases: [...]} - wrap in {data: ...} to match expected format
    const segmentsData = await response.json()
    
    return NextResponse.json({ data: segmentsData }, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    })
  } catch (error) {
    console.error("[segments] Error fetching segments:", error)
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 })
  }
}
