import { NextRequest, NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/backend-proxy"

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')

  if (!projectId) {
    return NextResponse.json({ error: "project_id is required" }, { status: 400 })
  }

  return proxyToBackend(`/api/cancel?project_id=${encodeURIComponent(projectId)}`, { method: "POST" })
}
