import { NextRequest, NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/backend-proxy"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 })
  }

  const params = new URLSearchParams()
  params.set('code', code)
  if (state) params.set('state', state)

  return proxyToBackend(`/api/oauth/gmail/callback?${params.toString()}`)
}
