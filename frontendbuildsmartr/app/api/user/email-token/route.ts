import { proxyToBackend } from "@/lib/backend-proxy"
import { NextResponse } from "next/server"

export async function GET() {
  // Get user info from backend which includes email connection details
  const response = await proxyToBackend("/api/user/info")
  const data = await response.json()

  // Check if there was an error
  if (response.status !== 200) {
    return NextResponse.json({ error: "Failed to fetch user info" }, { status: response.status })
  }

  // Transform the response to match what the frontend expects
  // Backend returns gmail_connected (boolean) and gmail_email (string)
  // Check for Gmail connection
  if (data.gmail_connected && data.gmail_email) {
    return NextResponse.json({
      provider: "gmail",
      email: data.gmail_email,
      connected: true
    })
  }

  // Check for Outlook connection
  if (data.outlook_connected && data.outlook_email) {
    return NextResponse.json({
      provider: "outlook",
      email: data.outlook_email,
      connected: true
    })
  }

  // No email connected
  return NextResponse.json({
    provider: null,
    email: null,
    connected: false,
    error: "no_email_connected"
  })
}
