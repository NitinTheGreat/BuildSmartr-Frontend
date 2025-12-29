import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID!;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET!;
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || "common";
const AZURE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/email/outlook/callback`
  : "http://localhost:3000/api/email/outlook/callback";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    console.error("[Outlook OAuth] Error:", error, errorDescription);
    return NextResponse.redirect(new URL("/account?error=outlook_auth_failed", request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/account?error=no_code", request.url));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.redirect(new URL("/account?error=unauthorized", request.url));
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
      return NextResponse.redirect(new URL("/account?error=token_exchange_failed", request.url));
    }

    // Get user info from Microsoft Graph to get their email
    const userInfoResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const outlookUserInfo = await userInfoResponse.json();
    const outlookEmail = outlookUserInfo.mail || outlookUserInfo.userPrincipalName;

    // Store tokens in user_info table
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      token_type: tokens.token_type,
      scope: tokens.scope,
      obtained_at: new Date().toISOString(),
    };

    // Upsert to user_info table
    const { error: upsertError } = await supabase
      .from("user_info")
      .upsert(
        {
          email: user.email,
          outlook_email: outlookEmail,
          outlook_token: tokenData,
        },
        {
          onConflict: "email",
        }
      );

    if (upsertError) {
      console.error("[Outlook OAuth] Database error:", upsertError);
      return NextResponse.redirect(new URL("/account?error=database_error", request.url));
    }

    return NextResponse.redirect(new URL("/account?success=outlook_connected", request.url));
  } catch (err) {
    console.error("[Outlook OAuth] Unexpected error:", err);
    return NextResponse.redirect(new URL("/account?error=unexpected_error", request.url));
  }
}
