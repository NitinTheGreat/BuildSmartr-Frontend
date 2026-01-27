import { getUser, getSession } from "@/utils/supabase/server";
import { Suspense } from "react";
import Image from "next/image";
import AuthButtons from "@/components/AuthButtons";
import AuthStateListener from "@/components/AuthStateListener";
import { GeneralChatInterface } from "@/components/GeneralChatInterface";
import { HomepageSkeleton } from "@/components/ui/skeletons";
import logo from "@/public/logo.png";
import type { Project } from "@/types/project";
import type { ProjectResponse } from "@/types/api";
import { toProject } from "@/lib/api";

// Database Backend URL (BuildSmartr-Backend)
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7072";

// Server-side prefetch of projects
async function prefetchProjects(accessToken: string): Promise<Project[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/projects`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      // Next.js 16 caching
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) return [];

    const data: ProjectResponse[] = await response.json();
    return data.map(toProject);
  } catch (error) {
    console.error("[page.tsx] Failed to prefetch projects:", error);
    return [];
  }
}

export default async function Page() {
  // Use cached auth helper (deduplicates calls across components)
  const { user } = await getUser();

  console.log("[page.tsx] user:", user?.email ?? "not authenticated");

  // Authenticated users see dashboard with projects
  if (user) {
    // Get session for access token
    const { session } = await getSession();

    // Prefetch projects on server (faster initial load)
    const initialProjects = session?.access_token
      ? await prefetchProjects(session.access_token)
      : [];

    return (
      <Suspense fallback={<HomepageSkeleton />}>
        <GeneralChatInterface initialProjects={initialProjects} />
      </Suspense>
    );
  }

  // Unauthenticated users see the login page
  return (
    <>
      <AuthStateListener />
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        {/* Subtle background gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/3 pointer-events-none" />
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md px-6 py-12 relative z-10">
          <div className="text-center mb-10">
            {/* IIVY Logo */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 flex items-center justify-center">
                <Image src={logo} alt="IIVY" width={48} height={48} />
              </div>
              <span className="text-4xl font-bold bg-gradient-to-r from-accent to-accent-strong bg-clip-text text-transparent">
                IIVY
              </span>
            </div>

            {/* Tagline badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-medium text-accent">Construction Knowledge Engine</span>
            </div>

            <h1 className="text-2xl font-semibold text-foreground mb-2">
              Welcome back
            </h1>
            <p className="text-muted-foreground text-sm">
              Sign in to continue to your projects
            </p>
          </div>

          <div className="flex flex-col items-center">
            <AuthButtons />
          </div>

          {/* Footer text */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </>
  );
}
