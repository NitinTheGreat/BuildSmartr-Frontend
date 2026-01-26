import { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/backend-proxy"

interface RouteParams {
  params: Promise<{ chat_id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { chat_id } = await params
  const body = await request.json()
  return proxyToBackend(`/api/chats/${chat_id}/messages/bulk`, { method: "POST", body })
}
