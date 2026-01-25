import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7071";

function getRedirectUri() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    return `${appUrl.replace(/\/$/, '')}/api/email/gmail/callback`;
  }
  return "http://localhost:3000/api/email/gmail/callback";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    console.error("[Gmail OAuth] Error:", error);
    return NextResponse.redirect(new URL("/account?error=gmail_auth_failed", request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/account?error=no_code", request.url));
  }

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const GOOGLE_REDIRECT_URI = getRedirectUri();
  console.log("[Gmail OAuth] Session exists:", !!session);
  console.log("[Gmail OAuth] Redirect URI being used:", GOOGLE_REDIRECT_URI);

  if (!session?.access_token) {
    console.error("[Gmail OAuth] No session or access token found");
    return NextResponse.redirect(new URL("/account?error=unauthorized", request.url));
  }

  try {
    // Exchange code for tokens
    console.log("[Gmail OAuth] Exchanging code for tokens...");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();
    console.log("[Gmail OAuth] Token exchange response:", tokens.error || "success");

    if (tokens.error) {
      console.error("[Gmail OAuth] Token error:", tokens.error, tokens.error_description);
      return NextResponse.redirect(new URL("/account?error=token_exchange_failed", request.url));
    }

    // Get user's Gmail email from Google's userinfo endpoint
    console.log("[Gmail OAuth] Fetching user email from Google...");
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const userInfo = await userInfoResponse.json();
    console.log("[Gmail OAuth] User email:", userInfo.email);

    if (!userInfo.email) {
      console.error("[Gmail OAuth] Failed to get user email from Google");
      return NextResponse.redirect(new URL("/account?error=no_email", request.url));
    }

    // Construct the token object in the format expected by the backend
    const expiryDate = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();
    const gmailToken = {
      token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_uri: "https://oauth2.googleapis.com/token",
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      scopes: tokens.scope ? tokens.scope.split(" ") : [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
      universe_domain: "googleapis.com",
      account: userInfo.email,
      expiry: expiryDate,
    };

    console.log("[Gmail OAuth] Constructed gmail_token object");

    const backendResponse = await fetch(`${BACKEND_URL}/api/user/connect/gmail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        gmail_email: userInfo.email,
        gmail_token: gmailToken,
      }),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text().catch(() => "");
      console.error("[Gmail OAuth] Backend error - URL:", `${BACKEND_URL}/api/user/connect/gmail`);
      console.error("[Gmail OAuth] Backend error - Status:", backendResponse.status);
      console.error("[Gmail OAuth] Backend error - Response:", errorText);
      return NextResponse.redirect(new URL("/account?error=backend_error", request.url));
    }

    console.log("[Gmail OAuth] Successfully connected Gmail!");
    return NextResponse.redirect(new URL("/account?success=gmail_connected", request.url));
  } catch (err) {
    console.error("[Gmail OAuth] Unexpected error:", err);
    return NextResponse.redirect(new URL("/account?error=unexpected_error", request.url));
  }
}
