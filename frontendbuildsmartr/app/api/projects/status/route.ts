import { NextRequest, NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/backend-proxy"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')

  if (!projectId) {
    return NextResponse.json({ error: "project_id is required" }, { status: 400 })
  }

  return proxyToBackend(`/api/status?project_id=${encodeURIComponent(projectId)}`)
}
