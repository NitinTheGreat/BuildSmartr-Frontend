import { NextRequest } from "next/server"
import { proxyToBackend, proxyDelete } from "@/lib/backend-proxy"

interface RouteParams {
  params: Promise<{ project_id: string; file_id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { project_id, file_id } = await params
  return proxyToBackend(`/api/projects/${project_id}/files/${file_id}`)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { project_id, file_id } = await params
  return proxyDelete(`/api/projects/${project_id}/files/${file_id}`)
}
