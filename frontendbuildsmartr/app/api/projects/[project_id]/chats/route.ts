import { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/backend-proxy"

interface RouteParams {
  params: Promise<{ project_id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { project_id } = await params
  return proxyToBackend(`/api/projects/${project_id}/chats`)
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { project_id } = await params
  const body = await request.json()
  return proxyToBackend(`/api/projects/${project_id}/chats`, { method: "POST", body })
}
