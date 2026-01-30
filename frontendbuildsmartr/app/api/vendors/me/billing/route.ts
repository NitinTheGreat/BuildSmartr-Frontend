import { NextRequest, NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/backend-proxy"

/**
 * GET /api/vendors/me/billing
 * Get billing summary for the current vendor
 */
export async function GET(request: NextRequest) {
  return proxyToBackend("/api/vendors/me/billing", { method: "GET" })
}
