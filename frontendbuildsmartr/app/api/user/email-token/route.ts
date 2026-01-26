import { proxyToBackend } from "@/lib/backend-proxy"

export async function GET() {
  return proxyToBackend("/api/user_email_tokens")
}
