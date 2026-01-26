import { NextRequest } from "next/server"
import { proxyToBackend, proxyWithBody } from "@/lib/backend-proxy"

interface RouteParams {
  params: Promise<{ chat_id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { chat_id } = await params
  return proxyToBackend(`/api/chats/${chat_id}/messages`)
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { chat_id } = await params
  const body = await request.json()
  return proxyToBackend(`/api/chats/${chat_id}/messages`, { method: "POST", body })
}
