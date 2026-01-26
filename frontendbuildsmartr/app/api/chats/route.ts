import { NextRequest } from "next/server"
import { proxyToBackend, proxyWithBody } from "@/lib/backend-proxy"

export async function GET() {
  return proxyToBackend("/api/chats")
}

export async function POST(request: NextRequest) {
  return proxyWithBody("/api/chats", request, "POST")
}
