import { getSession } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ProjectSkeleton } from "@/components/ui/skeletons";
import { ProjectPageClient } from "./ProjectPageClient";
import type { Project } from "@/types/project";
import type { ProjectResponse } from "@/types/api";
import { toProject } from "@/lib/api";

// Database Backend URL (BuildSmartr-Backend)
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7072";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Server-side prefetch of project details
async function prefetchProject(accessToken: string, projectId: string): Promise<Project | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      // Next.js caching
      next: { revalidate: 60 },
    });

    if (!response.ok) return null;

    const data: ProjectResponse = await response.json();
    return toProject(data);
  } catch (error) {
    console.error("[project/page.tsx] Failed to prefetch project:", error);
    return null;
  }
}

export default async function ProjectPage({ params }: PageProps) {
  const { id: projectId } = await params;
  const { session } = await getSession();

  // Redirect to login if not authenticated
  if (!session?.access_token) {
    redirect("/");
  }

  // Prefetch project on server
  const initialProject = await prefetchProject(session.access_token, projectId);

  // If project not found on server, let client handle the redirect
  // (in case it's a newly created project not yet synced)

  return (
    <Suspense fallback={<ProjectSkeleton />}>
      <ProjectPageClient projectId={projectId} initialProject={initialProject} />
    </Suspense>
  );
}
