import { NextRequest } from "next/server"
import { proxyToBackend, proxyWithBody } from "@/lib/backend-proxy"

export async function GET() {
  return proxyToBackend("/api/projects")
}

export async function POST(request: NextRequest) {
  return proxyWithBody("/api/projects", request, "POST")
}
