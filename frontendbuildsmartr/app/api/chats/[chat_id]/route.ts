import { NextRequest } from "next/server"
import { proxyToBackend, proxyDelete } from "@/lib/backend-proxy"

interface RouteParams {
  params: Promise<{ chat_id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { chat_id } = await params
  return proxyToBackend(`/api/chats/${chat_id}`)
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { chat_id } = await params
  const body = await request.json()
  return proxyToBackend(`/api/chats/${chat_id}`, { method: "PUT", body })
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { chat_id } = await params
  return proxyDelete(`/api/chats/${chat_id}`)
}
