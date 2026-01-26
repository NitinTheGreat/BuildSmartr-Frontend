"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function AuthStateListener() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        // Refresh the page to get updated server-rendered content
        router.refresh();
      } else if (event === "SIGNED_OUT") {
        // Force a hard redirect to clear all state
        window.location.href = "/";
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
