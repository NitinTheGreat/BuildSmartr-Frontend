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

    try {
        console.log("[projects/status] Polling status for:", projectId);

        const response = await fetch(
            `${AI_BACKEND_URL}/api/get_project_status?project_id=${encodeURIComponent(projectId)}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            // If 404, the project is not being indexed
            if (response.status === 404) {
                return NextResponse.json({
                    project_id: projectId,
                    status: "not_found",
                    percent: 0,
                    step: "No active indexing"
                });
            }

            const errorText = await response.text().catch(() => "Unknown error");
            console.error("[projects/status] Backend error:", response.status, errorText);
            return NextResponse.json({
                error: "Failed to get status",
                details: errorText
            }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (err) {
        console.error("[projects/status] Unexpected error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
