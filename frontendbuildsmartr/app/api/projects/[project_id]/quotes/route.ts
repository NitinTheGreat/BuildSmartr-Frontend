import { NextRequest, NextResponse } from "next/server"
import { proxyToBackend, proxyWithBody } from "@/lib/backend-proxy"

interface RouteContext {
  params: Promise<{ project_id: string }>
}

/**
 * GET /api/projects/[project_id]/quotes
 * List all quote requests for a project
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params
  return proxyToBackend(`/api/projects/${params.project_id}/quotes`, { method: "GET" })
}

/**
 * POST /api/projects/[project_id]/quotes
 * Create a new quote request for a project
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const params = await context.params
  return proxyWithBody(`/api/projects/${params.project_id}/quotes`, request, "POST")
}
