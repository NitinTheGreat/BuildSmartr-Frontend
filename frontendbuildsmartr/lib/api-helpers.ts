import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import type { Session } from "@supabase/supabase-js"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7071"

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH"

interface ApiOptions {
  /** Request body (will be JSON stringified) */
  body?: unknown
  /** HTTP method (defaults to GET) */
  method?: HttpMethod
}

/**
 * Execute a handler with authenticated session
 * Returns 401 if not authenticated, 503 if backend is unavailable
 */
export async function withAuth<T>(
  handler: (session: Session) => Promise<T>
): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await handler(session)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 })
  }
}

/**
 * Custom error class for API errors with status codes
 */
export class ApiError extends Error {
  constructor(message: string, public status: number = 500) {
    super(message)
    this.name = "ApiError"
  }
}

/**
 * Make an authenticated request to the backend
 */
export async function backendFetch<T>(
  endpoint: string,
  session: Session,
  options: ApiOptions = {}
): Promise<T> {
  const { body, method = "GET" } = options

  const headers: HeadersInit = {
    Authorization: `Bearer ${session.access_token}`,
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json"
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new ApiError(data.error || response.statusText, response.status)
  }

  return data as T
}

/**
 * Proxy a request to the backend with authentication
 * Useful for simple pass-through routes
 */
export async function proxyToBackend(
  endpoint: string,
  options: ApiOptions = {}
): Promise<NextResponse> {
  return withAuth(async (session) => {
    return backendFetch(endpoint, session, options)
  })
}
