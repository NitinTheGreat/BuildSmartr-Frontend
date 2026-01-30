import { NextRequest, NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/backend-proxy"

/**
 * GET /api/vendors/me/leads
 * Get all leads (impressions) for the current vendor
 */
export async function GET(request: NextRequest) {
  return proxyToBackend("/api/vendors/me/leads", { method: "GET" })
}
