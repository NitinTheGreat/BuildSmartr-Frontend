import { NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7071"

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`, {
      headers: { "Content-Type": "application/json" },
    })

    const data = await response.json().catch(() => ({ status: "unknown" }))
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ status: "unhealthy", error: "Backend unavailable" }, { status: 503 })
  }
}
