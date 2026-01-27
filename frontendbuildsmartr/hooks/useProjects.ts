"use client"

import useSWR, { mutate as globalMutate } from "swr"
import { useCallback } from "react"
import type { Project } from "@/types/project"
import type { ProjectResponse } from "@/types/api"
import { swrFetcher, toProject, postApi, putApi, deleteApi } from "@/lib/api"

const PROJECTS_KEY = "/api/projects"

interface UseProjectsOptions {
  /** Initial data from server-side prefetch */
  fallbackData?: Project[]
  /** Revalidate on mount even if fallbackData is provided */
  revalidateOnMount?: boolean
}

interface UseProjectsReturn {
  projects: Project[]
  isLoading: boolean
  isValidating: boolean
  error: Error | null
  /** Refresh projects from the server */
  refresh: () => Promise<void>
  /** Create a new project */
  createProject: (data: CreateProjectInput) => Promise<Project>
  /** Update a project */
  updateProject: (id: string, updates: UpdateProjectInput) => Promise<void>
  /** Delete a project */
  deleteProject: (id: string) => Promise<void>
}

interface CreateProjectInput {
  name: string
  description?: string
  companyAddress?: string
  tags?: string[]
}

interface UpdateProjectInput {
  name?: string
  description?: string
  companyAddress?: string
  tags?: string[]
}

/**
 * SWR hook for fetching and managing projects
 */
export function useProjects(options: UseProjectsOptions = {}): UseProjectsReturn {
  const { fallbackData, revalidateOnMount = !fallbackData } = options

  const { data, error, isLoading, isValidating, mutate } = useSWR<ProjectResponse[]>(
    PROJECTS_KEY,
    swrFetcher,
    {
      fallbackData: fallbackData ? fallbackData.map(projectToResponse) : undefined,
      revalidateOnMount,
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  )

  const projects = (data || []).map(toProject)

  const refresh = useCallback(async () => {
    await mutate()
  }, [mutate])

  const createProject = useCallback(async (input: CreateProjectInput): Promise<Project> => {
    const response = await postApi<ProjectResponse>(PROJECTS_KEY, {
      name: input.name,
      description: input.description || "",
      company_address: input.companyAddress || "",
      tags: input.tags || [],
    })

    const newProject = toProject(response)

    // Optimistically add to cache
    await mutate(
      (current) => [response, ...(current || [])],
      { revalidate: false }
    )

    return newProject
  }, [mutate])

  const updateProject = useCallback(async (id: string, updates: UpdateProjectInput): Promise<void> => {
    // Optimistically update
    await mutate(
      (current) => {
        if (!current) return current
        return current.map((p) =>
          p.id === id
            ? {
                ...p,
                name: updates.name ?? p.name,
                description: updates.description ?? p.description,
                company_address: updates.companyAddress ?? p.company_address,
                tags: updates.tags ?? p.tags,
                updated_at: new Date().toISOString(),
              }
            : p
        )
      },
      { revalidate: false }
    )

    // Actually update on server
    await putApi(`/projects/${id}`, {
      name: updates.name,
      description: updates.description,
      company_address: updates.companyAddress,
      tags: updates.tags,
    })

    // Revalidate to ensure consistency
    await mutate()
  }, [mutate])

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    // Optimistically remove from UI immediately
    await mutate(
      (current) => current?.filter((p) => p.id !== id),
      { revalidate: false }
    )

    // Actually delete on server
    await deleteApi(`/projects/${id}`)
    
    // Force revalidate to ensure cache is in sync with server
    await mutate()
  }, [mutate])

  return {
    projects,
    isLoading,
    isValidating,
    error: error ?? null,
    refresh,
    createProject,
    updateProject,
    deleteProject,
  }
}

/**
 * Hook for fetching a single project by ID
 */
export function useProject(projectId: string | null, options: { fallbackData?: Project } = {}) {
  const { data, error, isLoading, mutate } = useSWR<ProjectResponse>(
    projectId ? `/api/projects/${projectId}` : null,
    swrFetcher,
    {
      fallbackData: options.fallbackData ? projectToResponse(options.fallbackData) : undefined,
      revalidateOnFocus: false,
    }
  )

  const project = data ? toProject(data) : null

  const refresh = useCallback(async () => {
    await mutate()
  }, [mutate])

  return {
    project,
    isLoading,
    error: error ?? null,
    refresh,
  }
}

/**
 * Invalidate all project-related caches
 */
export function invalidateProjects() {
  globalMutate((key) => typeof key === "string" && key.startsWith("/api/projects"))
}

// Helper to convert Project back to API response format (for optimistic updates)
function projectToResponse(project: Project): ProjectResponse {
  return {
    id: project.id,
    user_id: "", // Not needed for display
    name: project.name,
    description: project.description,
    company_address: project.companyAddress,
    tags: project.tags,
    is_owner: true,
    permission: "owner",
    files: project.files.map((f) => ({
      id: f.id,
      project_id: project.id,
      name: f.name,
      size: f.size,
      type: f.type,
      category: f.category,
      url: f.url || null,
      created_at: new Date().toISOString(),
    })),
    chats: project.chats.map((c) => ({
      id: c.id,
      user_id: "",
      project_id: project.id,
      title: c.title,
      chat_type: "project",
      messages: c.messages.map((m) => ({
        id: m.id,
        chat_id: c.id,
        role: m.role,
        content: m.content,
        search_modes: m.searchModes || null,
        timestamp: m.timestamp.toISOString(),
      })),
      message_count: c.messageCount,
      created_at: c.createdAt.toISOString(),
      updated_at: c.updatedAt.toISOString(),
    })),
    created_at: project.createdAt.toISOString(),
    updated_at: project.updatedAt.toISOString(),
  }
}
