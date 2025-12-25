"use client";

import { useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export default function AuthButtons() {
  const login = useCallback(async (provider: "google" | "azure") => {
    const supabase = createClient();

    const scopes =
      provider === "google"
        ? "openid email profile"
        : "openid email profile User.Read";

    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: "http://localhost:3000/auth/callback",
        scopes,
        queryParams: provider === "google" ? { access_type: "offline", prompt: "consent" } : undefined,
      },
    });
  }, []);

  return (
    <div style={{ display: "flex", gap: "12px" }}>
      <button
        onClick={() => login("google")}
        style={{ padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}
      >
        Login Google
      </button>
      <button
        onClick={() => login("azure")}
        style={{ padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}
      >
        Login Microsoft
      </button>
    </div>
  );
}
