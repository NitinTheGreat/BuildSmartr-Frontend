import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/utils/supabase/server"

// Database Backend URL (BuildSmartr-Backend)
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7072"

interface RouteParams {
  params: Promise<{ project_id: string; file_id: string }>
}

// Special handling for file downloads (binary streaming, not JSON)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { session } = await getSession()

  if (!session?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { project_id, file_id } = await params

  try {
    const response = await fetch(`${BACKEND_URL}/api/projects/${project_id}/files/${file_id}/download`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    if (response.ok) {
      const blob = await response.blob()
      const headers = new Headers()
      headers.set("Content-Type", response.headers.get("Content-Type") || "application/octet-stream")
      headers.set("Content-Disposition", response.headers.get("Content-Disposition") || "attachment")
      return new NextResponse(blob, { status: 200, headers })
    }

    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 })
  }
}
