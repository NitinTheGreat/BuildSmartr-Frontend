import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const AI_BACKEND_URL = process.env.NEXT_PUBLIC_AI_BACKEND_URL || "http://localhost:7071";

/**
 * GET /api/projects/status?project_id={project_id}
 * 
 * Polls the AI backend for project indexing status.
 * Returns current progress percentage, step, and details.
 */
export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");

    if (!projectId) {
        return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }

    const statusUrl = `${AI_BACKEND_URL}/api/get_project_status?project_id=${encodeURIComponent(projectId)}`;

    console.log("[projects/status] ====== STATUS POLL ======");
    console.log("[projects/status] Project ID:", projectId);
    console.log("[projects/status] Backend URL:", statusUrl);

    try {
        const response = await fetch(statusUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        console.log("[projects/status] Response status:", response.status);

        const responseText = await response.text();
        console.log("[projects/status] Raw response:", responseText);

        // Try to parse as JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch {
            console.error("[projects/status] Failed to parse JSON response");
            return NextResponse.json({
                project_id: projectId,
                status: "not_found",
                percent: 0,
                step: "No active indexing"
            });
        }

        console.log("[projects/status] Parsed data:", JSON.stringify(data, null, 2));
        console.log("[projects/status] Status:", data.status);
        console.log("[projects/status] Details:", JSON.stringify(data.details));
        console.log("[projects/status] Stats fields - thread:", data.details?.thread_count, "msg:", data.details?.message_count, "pdf:", data.details?.pdf_count);

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json({
                    project_id: projectId,
                    status: "not_found",
                    percent: 0,
                    step: "No active indexing"
                });
            }

            return NextResponse.json({
                error: "Failed to get status",
                details: responseText
            }, { status: response.status });
        }

        return NextResponse.json(data);

    } catch (err) {
        console.error("[projects/status] Unexpected error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
