import { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/backend-proxy"

interface RouteParams {
  params: Promise<{ chat_id: string }>
}

/**
 * POST /api/chats/{chat_id}/summary
 * Generate or update the conversation summary.
 * Called after messages to compress conversation context.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { chat_id } = await params
  
  // Parse optional body
  let body = {}
  try {
    body = await request.json()
  } catch {
    // Body is optional
  }
  
  return proxyToBackend(`/api/chats/${chat_id}/summary`, { method: "POST", body })
}
