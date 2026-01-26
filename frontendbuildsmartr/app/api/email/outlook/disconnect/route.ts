import { proxyToBackend } from "@/lib/backend-proxy"

export async function POST() {
  return proxyToBackend("/api/oauth/outlook/disconnect", { method: "POST" })
}
