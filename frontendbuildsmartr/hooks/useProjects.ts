"use client"

import useSWR, { mutate as globalMutate } from "swr"
import { useCallback } from "react"
import type { Project, ProjectFile } from "@/types/project"
import type { ProjectResponse } from "@/types/api"
import { swrFetcher, toProject, toProjectFile, postApi, putApi, deleteApi } from "@/lib/api"

const PROJECTS_KEY = "/api/projects"

interface UseProjectsOptions {
  /** Initial data from server-side prefetch */
  fallbackData?: Project[]
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
  /** Add files to a project */
  addFiles: (projectId: string, files: File[], category: string) => Promise<void>
  /** Remove a file from a project */
  removeFile: (projectId: string, fileId: string) => Promise<void>
}

interface CreateProjectInput {
  name: string
  description?: string
  companyAddress?: string
  tags?: string[]
  files?: File[]
}

interface UpdateProjectInput {
  name?: string
  description?: string
  companyAddress?: string
  tags?: string[]
  // Structured address fields for quotes feature
  addressStreet?: string
  addressCity?: string
  addressRegion?: string
  addressCountry?: string
  addressPostal?: string
}

/**
 * SWR hook for fetching and managing projects
 * Single source of truth: DATABASE
 */
export function useProjects(options: UseProjectsOptions = {}): UseProjectsReturn {
  const { fallbackData } = options

  const { data, error, isLoading, isValidating, mutate } = useSWR<ProjectResponse[]>(
    PROJECTS_KEY,
    swrFetcher,
    {
      fallbackData: fallbackData ? fallbackData.map(projectToResponse) : undefined,
      // Sensible defaults - avoid aggressive revalidation
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  )

  const projects = (data || []).map(toProject)

  const refresh = useCallback(async () => {
    await mutate()
  }, [mutate])

  const createProject = useCallback(async (input: CreateProjectInput): Promise<Project> => {
    const response = await postApi<ProjectResponse>("/projects", {
      name: input.name,
      description: input.description || "",
      company_address: input.companyAddress || "",
      tags: input.tags || [],
    })

    const newProject = toProject(response)

    // Upload files if any
    if (input.files && input.files.length > 0) {
      for (const file of input.files) {
        try {
          const formData = new FormData()
          formData.append("file", file)
          formData.append("category", "other")
          await fetch(`/api/projects/${newProject.id}/files`, {
            method: "POST",
            body: formData,
          })
        } catch (fileErr) {
          console.error("Failed to upload file:", file.name, fileErr)
        }
      }
    }

    // Revalidate to get fresh data from server (includes uploaded files)
    await mutate()

    return newProject
  }, [mutate])

  const updateProject = useCallback(async (id: string, updates: UpdateProjectInput): Promise<void> => {
    // Update on server first
    await putApi(`/projects/${id}`, {
      name: updates.name,
      description: updates.description,
      company_address: updates.companyAddress,
      tags: updates.tags,
      // Structured address fields for quotes feature
      address_street: updates.addressStreet,
      address_city: updates.addressCity,
      address_region: updates.addressRegion,
      address_country: updates.addressCountry,
      address_postal: updates.addressPostal,
    })

    // Revalidate to get fresh data from server
    await mutate()
  }, [mutate])

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    // Delete on server first
    await deleteApi(`/projects/${id}`)

    // Revalidate to get fresh data from server
    await mutate()
  }, [mutate])

  const addFiles = useCallback(async (projectId: string, files: File[], category: string): Promise<void> => {
    for (const file of files) {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("category", category)
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        body: formData,
      })
      if (!response.ok) throw new Error("Upload failed")
    }

    // Revalidate to get fresh data from server
    await mutate()
  }, [mutate])

  const removeFile = useCallback(async (projectId: string, fileId: string): Promise<void> => {
    await deleteApi(`/projects/${projectId}/files/${fileId}`)

    // Revalidate to get fresh data from server
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
    addFiles,
    removeFile,
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
      revalidateOnReconnect: true,
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
    mutate,
  }
}

/**
 * Invalidate all project-related caches - call this after any project mutation
 */
export function invalidateProjects() {
  globalMutate((key) => typeof key === "string" && key.startsWith("/api/projects"))
}

// Helper to convert Project back to API response format (for fallback data)
function projectToResponse(project: Project): ProjectResponse {
  return {
    id: project.id,
    user_id: "",
    name: project.name,
    description: project.description,
    company_address: project.companyAddress,
    tags: project.tags,
    is_owner: true,
    permission: "owner",
    ai_project_id: project.aiProjectId,
    indexing_status: project.indexingStatus,
    indexing_error: project.indexingError,
    // Structured address fields for quotes feature
    address_street: project.addressStreet || null,
    address_city: project.addressCity || null,
    address_region: project.addressRegion || null,
    address_country: project.addressCountry || null,
    address_postal: project.addressPostal || null,
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
