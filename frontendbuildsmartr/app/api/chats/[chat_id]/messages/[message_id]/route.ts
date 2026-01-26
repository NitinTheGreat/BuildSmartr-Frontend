import { NextRequest } from "next/server"
import { proxyToBackend, proxyDelete } from "@/lib/backend-proxy"

interface RouteParams {
  params: Promise<{ chat_id: string; message_id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { chat_id, message_id } = await params
  return proxyToBackend(`/api/chats/${chat_id}/messages/${message_id}`)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { chat_id, message_id } = await params
  return proxyDelete(`/api/chats/${chat_id}/messages/${message_id}`)
}
