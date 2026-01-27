import { NextRequest } from "next/server"
import { proxyToBackend, proxyWithBody, proxyDelete } from "@/lib/backend-proxy"

interface RouteParams {
  params: Promise<{ project_id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { project_id } = await params
  return proxyToBackend(`/api/projects/${project_id}`)
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { project_id } = await params
  const body = await request.json()
  return proxyToBackend(`/api/projects/${project_id}`, { method: "PUT", body })
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { project_id } = await params
  return proxyDelete(`/api/projects/${project_id}`)
}
