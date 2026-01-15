import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/user/email-token
 * 
 * Fetches the user's connected email token (Gmail or Outlook) from the user_info table.
 * Returns the token credentials needed for the AI indexing backend.
 */
export async function GET() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Fetch user_info to get email tokens
        const { data: userInfo, error } = await supabase
            .from("user_info")
            .select("gmail_email, gmail_token, outlook_email, outlook_token")
            .eq("email", session.user.email)
            .single();

        if (error) {
            console.error("[email-token] Supabase error:", error);
            return NextResponse.json({ error: "Failed to fetch user info" }, { status: 500 });
        }

        // Check for Gmail token first
        if (userInfo?.gmail_token && userInfo?.gmail_email) {
            return NextResponse.json({
                provider: "gmail",
                email: userInfo.gmail_email,
                credentials: {
                    access_token: userInfo.gmail_token.token,
                    refresh_token: userInfo.gmail_token.refresh_token,
                    token_uri: userInfo.gmail_token.token_uri || "https://oauth2.googleapis.com/token",
                    client_id: userInfo.gmail_token.client_id,
                    client_secret: userInfo.gmail_token.client_secret,
                }
            });
        }

        // Check for Outlook token
        if (userInfo?.outlook_token && userInfo?.outlook_email) {
            return NextResponse.json({
                provider: "outlook",
                email: userInfo.outlook_email,
                credentials: userInfo.outlook_token
            });
        }

        // No email connected
        return NextResponse.json({
            error: "no_email_connected",
            message: "Please connect your Gmail or Outlook account first"
        }, { status: 404 });

    } catch (err) {
        console.error("[email-token] Unexpected error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
