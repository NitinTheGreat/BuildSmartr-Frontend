import { NextRequest, NextResponse } from "next/server"
import { proxyToBackend, proxyWithBody } from "@/lib/backend-proxy"

/**
 * GET /api/vendor-services
 * List all vendor services for the current user
 */
export async function GET(request: NextRequest) {
  return proxyToBackend("/api/vendor-services", { method: "GET" })
}

/**
 * POST /api/vendor-services
 * Create a new vendor service offering
 */
export async function POST(request: NextRequest) {
  return proxyWithBody("/api/vendor-services", request, "POST")
}
