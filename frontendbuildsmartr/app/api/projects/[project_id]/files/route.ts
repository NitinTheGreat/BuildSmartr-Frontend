import { NextRequest } from "next/server"
import { proxyToBackend, proxyWithFormData } from "@/lib/backend-proxy"

interface RouteParams {
  params: Promise<{ project_id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { project_id } = await params
  return proxyToBackend(`/api/projects/${project_id}/files`)
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { project_id } = await params
  return proxyWithFormData(`/api/projects/${project_id}/files`, request, "POST")
}
