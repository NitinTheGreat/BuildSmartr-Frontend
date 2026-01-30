import { NextRequest, NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/backend-proxy"

interface RouteContext {
  params: Promise<{ quote_id: string }>
}

/**
 * GET /api/quotes/[quote_id]
 * Get a single quote request with full details
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params
  return proxyToBackend(`/api/quotes/${params.quote_id}`, { method: "GET" })
}
