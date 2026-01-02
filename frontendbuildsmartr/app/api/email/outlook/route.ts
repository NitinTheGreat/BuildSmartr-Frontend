import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// Microsoft/Azure OAuth configuration
const AZURE_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID!;
const AZURE_TENANT_ID = process.env.MICROSOFT_TENANT_ID || "common"; // Use 'common' for multi-tenant
const AZURE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/email/outlook/callback`
  : "http://localhost:3000/api/email/outlook/callback";

// Microsoft Graph scopes needed for email access
const OUTLOOK_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "Mail.Read",
  "Mail.Send",
  "Mail.ReadWrite",
  "User.Read",
].join(" ");

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Build Microsoft OAuth URL
  const authUrl = new URL(`https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/authorize`);
  authUrl.searchParams.set("client_id", AZURE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", AZURE_REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", OUTLOOK_SCOPES);
  authUrl.searchParams.set("response_mode", "query");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", user.email || user.id); // Pass user email as state for verification

  return NextResponse.redirect(authUrl.toString());
}
