import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const AI_BACKEND_URL = process.env.NEXT_PUBLIC_AI_BACKEND_URL || "http://localhost:7071";

/**
 * POST /api/projects/index
 * 
 * Initiates email indexing and vectorization for a project.
 * Fetches user's email credentials and forwards to the AI backend.
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { project_name, max_threads = 50 } = body;

        if (!project_name) {
            return NextResponse.json({ error: "project_name is required" }, { status: 400 });
        }

        // Fetch user's email credentials
        const { data: userInfo, error: userError } = await supabase
            .from("user_info")
            .select("gmail_email, gmail_token, outlook_email, outlook_token")
            .eq("email", session.user.email)
            .single();

        if (userError) {
            console.error("[projects/index] Failed to fetch user info:", userError);
            return NextResponse.json({ error: "Failed to fetch user credentials" }, { status: 500 });
        }

        // Determine which email provider to use
        let gmailCredentials = null;
        let userEmail = session.user.email;

        if (userInfo?.gmail_token && userInfo?.gmail_email) {
            userEmail = userInfo.gmail_email;
            gmailCredentials = {
                access_token: userInfo.gmail_token.token,
                refresh_token: userInfo.gmail_token.refresh_token,
                token_uri: userInfo.gmail_token.token_uri || "https://oauth2.googleapis.com/token",
                client_id: userInfo.gmail_token.client_id,
                client_secret: userInfo.gmail_token.client_secret,
            };
        } else if (userInfo?.outlook_token && userInfo?.outlook_email) {
            // TODO: Handle Outlook credentials when backend supports it
            return NextResponse.json({
                error: "Outlook indexing is not yet supported"
            }, { status: 400 });
        } else {
            return NextResponse.json({
                error: "no_email_connected",
                message: "Please connect your Gmail or Outlook account first"
            }, { status: 404 });
        }

        // Call the AI backend
        console.log("[projects/index] Calling AI backend:", `${AI_BACKEND_URL}/api/index_and_vectorize`);

        const indexResponse = await fetch(`${AI_BACKEND_URL}/api/index_and_vectorize`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                project_name,
                user_email: userEmail,
                gmail_credentials: gmailCredentials,
                max_threads,
            }),
        });

        if (!indexResponse.ok) {
            const errorText = await indexResponse.text().catch(() => "Unknown error");
            console.error("[projects/index] AI backend error:", indexResponse.status, errorText);
            return NextResponse.json({
                error: "Indexing failed",
                details: errorText
            }, { status: indexResponse.status });
        }

        const result = await indexResponse.json();
        return NextResponse.json(result);

    } catch (err) {
        console.error("[projects/index] Unexpected error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
