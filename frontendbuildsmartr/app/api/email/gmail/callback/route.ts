import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/email/gmail/callback`
  : "http://localhost:3000/api/email/gmail/callback";

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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.redirect(new URL("/account?error=unauthorized", request.url));
  }

  try {
    // Exchange code for tokens
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

    if (tokens.error) {
      console.error("[Gmail OAuth] Token error:", tokens.error);
      return NextResponse.redirect(new URL("/account?error=token_exchange_failed", request.url));
    }

    // Get Gmail user info to get their email
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const gmailUserInfo = await userInfoResponse.json();
    const gmailEmail = gmailUserInfo.email;

    // Store tokens in user_info table
    // We store both access_token and refresh_token as JSON
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
          gmail_email: gmailEmail,
          gmail_token: tokenData,
        },
        {
          onConflict: "email",
        }
      );

    if (upsertError) {
      console.error("[Gmail OAuth] Database error:", upsertError);
      return NextResponse.redirect(new URL("/account?error=database_error", request.url));
    }

    return NextResponse.redirect(new URL("/account?success=gmail_connected", request.url));
  } catch (err) {
    console.error("[Gmail OAuth] Unexpected error:", err);
    return NextResponse.redirect(new URL("/account?error=unexpected_error", request.url));
  }
}
