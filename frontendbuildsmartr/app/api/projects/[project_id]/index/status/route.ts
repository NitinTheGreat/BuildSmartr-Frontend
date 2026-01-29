/**
 * Project Indexing Status API Route
 * Gets the current indexing status for a project via Database Backend
 */

import { createClient } from "@/utils/supabase/server"
import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7072"

export async function GET(
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
        // Forward request to Database Backend's status endpoint
        const response = await fetch(`${BACKEND_URL}/api/projects/${project_id}/index/status`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
        })

        const data = await response.json().catch(() => ({}))

        // Add cache headers for frequent polling
        const headers = new Headers()
        headers.set("Cache-Control", "private, max-age=1")

        return NextResponse.json(data, { status: response.status, headers })
    } catch (error) {
        console.error("[projects/index/status] Error:", error)
        return NextResponse.json({ error: "Backend unavailable" }, { status: 503 })
    }
}
