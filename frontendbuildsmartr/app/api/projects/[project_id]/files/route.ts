import { createClient } from "@/utils/supabase/server"
import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7071"

interface RouteParams {
  params: Promise<{ project_id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { project_id } = await params

  try {
    const response = await fetch(`${BACKEND_URL}/api/projects/${project_id}/files`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { project_id } = await params

  try {
    const formData = await request.formData()
    const response = await fetch(`${BACKEND_URL}/api/projects/${project_id}/files`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    })
    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 })
  }
}
