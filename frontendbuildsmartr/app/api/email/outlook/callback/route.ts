import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

const AZURE_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID!;
const AZURE_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET!;
const AZURE_TENANT_ID = process.env.MICROSOFT_TENANT_ID || "common";
const AZURE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/email/outlook/callback`
  : "http://localhost:3000/api/email/outlook/callback";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7071";

// Helper function to get the correct base URL for redirects
// This fixes the issue where request.url returns internal Docker hostname in production
function getAppBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    return appUrl.replace(/\/$/, '');
  }
  return "http://localhost:3000";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  
  // Use the app base URL for all redirects (fixes Docker/reverse proxy issues)
  const baseUrl = getAppBaseUrl();

  if (error) {
    console.error("[Outlook OAuth] Error:", error, errorDescription);
    return NextResponse.redirect(`${baseUrl}/account?error=outlook_auth_failed`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/account?error=no_code`);
  }

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.redirect(`${baseUrl}/account?error=unauthorized`);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: AZURE_CLIENT_ID,
          client_secret: AZURE_CLIENT_SECRET,
          redirect_uri: AZURE_REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      }
    );

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error("[Outlook OAuth] Token error:", tokens.error, tokens.error_description);
      return NextResponse.redirect(`${baseUrl}/account?error=token_exchange_failed`);
    }

    // Call backend to store the Outlook connection
    const backendResponse = await fetch(`${BACKEND_URL}/api/user/connect/outlook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        token_type: tokens.token_type,
        scope: tokens.scope,
      }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      console.error("[Outlook OAuth] Backend error:", errorData);
      return NextResponse.redirect(`${baseUrl}/account?error=backend_error`);
    }

    return NextResponse.redirect(`${baseUrl}/account?success=outlook_connected`);
  } catch (err) {
    console.error("[Outlook OAuth] Unexpected error:", err);
    return NextResponse.redirect(`${baseUrl}/account?error=unexpected_error`);
  }
}
