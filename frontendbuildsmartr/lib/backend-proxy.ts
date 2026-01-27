/**
 * Backend Proxy Utility
 * Eliminates boilerplate across API routes by providing a reusable proxy function
 */

import { createClient } from "@/utils/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// Database Backend URL (BuildSmartr-Backend)
// Note: AI Backend runs on 7071, Database Backend runs on 7072
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7072"

export interface ProxyOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  body?: unknown
  formData?: FormData
  headers?: Record<string, string>
  /** Custom backend path (if different from the default) */
  customPath?: string
}

/**
 * Proxy a request to the backend with authentication
 * Handles auth token retrieval, error handling, and response formatting
 */
export async function proxyToBackend(
  path: string,
  options: ProxyOptions = {}
): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { method = "GET", body, formData, headers: customHeaders, customPath } = options
  const backendPath = customPath ?? path

  try {
    const requestHeaders: Record<string, string> = {
      Authorization: `Bearer ${session.access_token}`,
      ...customHeaders,
    }

    // Only add Content-Type for JSON bodies (not for FormData)
    if (body && !formData) {
      requestHeaders["Content-Type"] = "application/json"
    }

    const response = await fetch(`${BACKEND_URL}${backendPath}`, {
      method,
      headers: requestHeaders,
      body: formData ?? (body ? JSON.stringify(body) : undefined),
    })

    // Handle 204 No Content (e.g., successful DELETE)
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 })
    }

    const data = await response.json().catch(() => ({}))

    // Add cache headers for GET requests
    const responseHeaders = new Headers()
    if (method === "GET") {
      responseHeaders.set("Cache-Control", "private, max-age=60, stale-while-revalidate=300")
    }

    return NextResponse.json(data, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error(`[proxyToBackend] Error proxying to ${backendPath}:`, error)
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 })
  }
}

/**
 * Helper to extract and proxy with request body
 */
export async function proxyWithBody(
  path: string,
  request: NextRequest,
  method: "POST" | "PUT" | "PATCH" = "POST"
): Promise<NextResponse> {
  const body = await request.json()
  return proxyToBackend(path, { method, body })
}

/**
 * Helper to proxy FormData (for file uploads)
 */
export async function proxyWithFormData(
  path: string,
  request: NextRequest,
  method: "POST" | "PUT" = "POST"
): Promise<NextResponse> {
  const formData = await request.formData()
  return proxyToBackend(path, { method, formData })
}

/**
 * Helper to proxy DELETE requests
 */
export async function proxyDelete(path: string): Promise<NextResponse> {
  return proxyToBackend(path, { method: "DELETE" })
}

/**
 * Get the current session's access token (useful for server components)
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

/**
 * Fetch from backend directly (for server components, not API routes)
 */
export async function fetchFromBackend<T>(
  path: string,
  options: Omit<ProxyOptions, "formData"> = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  const accessToken = await getAccessToken()

  if (!accessToken) {
    return { data: null, error: "Unauthorized", status: 401 }
  }

  const { method = "GET", body, headers: customHeaders } = options

  try {
    const requestHeaders: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      ...customHeaders,
    }

    if (body) {
      requestHeaders["Content-Type"] = "application/json"
    }

    const response = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      return { data: null, error: data?.error || "Request failed", status: response.status }
    }

    return { data, error: null, status: response.status }
  } catch (error) {
    console.error(`[fetchFromBackend] Error:`, error)
    return { data: null, error: "Backend unavailable", status: 503 }
  }
}
