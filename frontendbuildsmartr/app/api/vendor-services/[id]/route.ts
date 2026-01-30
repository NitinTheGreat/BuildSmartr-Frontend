import { NextRequest, NextResponse } from "next/server"
import { proxyToBackend, proxyWithBody, proxyDelete } from "@/lib/backend-proxy"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/vendor-services/[id]
 * Update a vendor service offering
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const params = await context.params
  return proxyWithBody(`/api/vendor-services/${params.id}`, request, "PUT")
}

/**
 * DELETE /api/vendor-services/[id]
 * Delete a vendor service offering
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const params = await context.params
  return proxyDelete(`/api/vendor-services/${params.id}`)
}
