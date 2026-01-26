import { NextRequest } from "next/server"
import { proxyWithBody } from "@/lib/backend-proxy"

export async function POST(request: NextRequest) {
  return proxyWithBody("/api/generate_project_id", request, "POST")
}
