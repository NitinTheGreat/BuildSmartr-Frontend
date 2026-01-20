import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

const AI_BACKEND_URL = process.env.NEXT_PUBLIC_AI_BACKEND_URL || "http://localhost:7071";
const AZURE_FUNCTION_KEY = process.env.NEXT_PUBLIC_AZURE_FUNCTION_KEY || "";

/**
 * GET /api/projects/list
 * 
 * Lists all projects for the current user from the AI backend.
 * Calls the AI backend's list_projects endpoint.
 */
export async function GET() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = `${AI_BACKEND_URL}/api/list_projects?user_email=${encodeURIComponent(session.user.email)}`;

    console.log("[projects/list] Fetching projects for:", session.user.email);

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-functions-key": AZURE_FUNCTION_KEY,
            },
        });

        const data = await response.json().catch(() => ({}));
        console.log("[projects/list] Response:", response.status, data);
        return NextResponse.json(data, { status: response.status });

    } catch (err) {
        console.error("[projects/list] Error:", err);
        return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
    }
}
