/**
 * Streaming Search API Route
 * Proxies SSE streaming search requests to the Database Backend
 */

import { createClient } from "@/utils/supabase/server"
import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7072"

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ project_id: string }> }
) {
    const { project_id } = await params
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { question, top_k } = body

        if (!question) {
            return NextResponse.json({ error: "question is required" }, { status: 400 })
        }

        // Forward request to Database Backend's streaming endpoint
        const response = await fetch(`${BACKEND_URL}/api/projects/${project_id}/search/stream`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ question, top_k }),
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: "Search failed" }))
            return NextResponse.json(error, { status: response.status })
        }

        // Stream the response back to the client
        const headers = new Headers()
        headers.set("Content-Type", "text/event-stream")
        headers.set("Cache-Control", "no-cache")
        headers.set("Connection", "keep-alive")

        // Create a TransformStream to pipe the SSE data
        const { readable, writable } = new TransformStream()

        // Pipe backend response to client
        response.body?.pipeTo(writable).catch((err) => {
            console.error("[search/stream] Pipe error:", err)
        })

        return new Response(readable, { headers })

    } catch (error) {
        console.error("[search/stream] Error:", error)
        return NextResponse.json({ error: "Search failed" }, { status: 500 })
    }
}
