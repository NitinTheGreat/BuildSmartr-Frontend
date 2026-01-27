import { NextRequest } from "next/server"
import { proxyWithBody } from "@/lib/backend-proxy"

export async function POST(request: NextRequest) {
  return proxyWithBody("/api/user/connect/gmail", request, "POST")
}
