import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const AI_BACKEND_URL = process.env.NEXT_PUBLIC_AI_BACKEND_URL || "http://localhost:7071";
const AZURE_FUNCTION_KEY = process.env.NEXT_PUBLIC_AZURE_FUNCTION_KEY || "";

/**
 * GET /api/projects/details?project_id={project_id}
 * 
 * Fetches project details from the AI backend's get_project endpoint.
 * Returns project_name, thread_count, message_count, etc.
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

    const url = `${AI_BACKEND_URL}/api/get_project?project_id=${encodeURIComponent(projectId)}`;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-functions-key": AZURE_FUNCTION_KEY,
            },
        });

        const data = await response.json().catch(() => ({}));
        return NextResponse.json(data, { status: response.status });

    } catch (err) {
        console.error("[projects/details] Error:", err);
        return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
    }
}
