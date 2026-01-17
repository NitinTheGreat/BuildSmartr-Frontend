import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const AI_BACKEND_URL = process.env.NEXT_PUBLIC_AI_BACKEND_URL || "http://localhost:7071";
const AZURE_FUNCTION_KEY = process.env.NEXT_PUBLIC_AZURE_FUNCTION_KEY || "";

/**
 * POST /api/projects/generate-id
 * 
 * Generates a project_id with user hash BEFORE starting indexing.
 * This allows polling to start immediately with the correct ID.
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { project_name } = body;

        if (!project_name) {
            return NextResponse.json({ error: "project_name is required" }, { status: 400 });
        }

        console.log("[projects/generate-id] Generating ID for:", project_name);

        const response = await fetch(`${AI_BACKEND_URL}/api/generate_project_id`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-functions-key": AZURE_FUNCTION_KEY,
            },
            body: JSON.stringify({
                project_name,
                user_email: session.user.email
            }),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => "Unknown error");
            console.error("[projects/generate-id] Backend error:", response.status, errorText);
            return NextResponse.json({
                error: "Failed to generate project ID",
                details: errorText
            }, { status: response.status });
        }

        const result = await response.json();
        console.log("[projects/generate-id] Got project_id:", result.project_id);

        return NextResponse.json(result);

    } catch (err) {
        console.error("[projects/generate-id] Unexpected error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
