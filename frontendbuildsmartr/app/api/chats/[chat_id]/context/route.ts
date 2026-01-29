import { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/backend-proxy"

interface RouteParams {
  params: Promise<{ chat_id: string }>
}

/**
 * GET /api/chats/{chat_id}/context
 * Get conversation context for AI search (summary + recent messages).
 * Used by useStreamingSearch hook to enable follow-up questions.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { chat_id } = await params
  return proxyToBackend(`/api/chats/${chat_id}/context`)
}
