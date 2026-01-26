"use client"

import useSWR, { mutate as globalMutate } from "swr"
import { useCallback } from "react"
import type { ProjectFile, FileCategory } from "@/types/project"
import type { ProjectFileResponse } from "@/types/api"
import { swrFetcher, toProjectFile, deleteApi } from "@/lib/api"

interface UseFilesOptions {
  /** Initial files data */
  fallbackData?: ProjectFile[]
}

interface UseFilesReturn {
  files: ProjectFile[]
  isLoading: boolean
  error: Error | null
  /** Upload files to the project */
  uploadFiles: (files: File[], category: FileCategory) => Promise<ProjectFile[]>
  /** Remove a file from the project */
  removeFile: (fileId: string) => Promise<void>
  /** Refresh files */
  refresh: () => Promise<void>
}

/**
 * SWR hook for managing project files
 */
export function useFiles(
  projectId: string | null,
  options: UseFilesOptions = {}
): UseFilesReturn {
  const key = projectId ? `/api/projects/${projectId}/files` : null

  const { data, error, isLoading, mutate } = useSWR<ProjectFileResponse[]>(
    key,
    swrFetcher,
    {
      fallbackData: options.fallbackData?.map(fileToResponse),
      revalidateOnFocus: false,
    }
  )

  const files = (data || []).map(toProjectFile)

  const uploadFiles = useCallback(async (
    filesToUpload: File[],
    category: FileCategory
  ): Promise<ProjectFile[]> => {
    if (!projectId) throw new Error("No project ID")

    const uploadedFiles: ProjectFile[] = []

    for (const file of filesToUpload) {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("category", category)

      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Upload failed" }))
        throw new Error(error.error || "Upload failed")
      }

      const fileData: ProjectFileResponse = await response.json()
      uploadedFiles.push(toProjectFile(fileData))
    }

    // Update cache with new files
    await mutate(
      (current) => [...(current || []), ...uploadedFiles.map(fileToResponse)],
      { revalidate: false }
    )

    return uploadedFiles
  }, [projectId, mutate])

  const removeFile = useCallback(async (fileId: string): Promise<void> => {
    if (!projectId) throw new Error("No project ID")

    // Optimistically remove
    await mutate(
      (current) => current?.filter((f) => f.id !== fileId),
      { revalidate: false }
    )

    await deleteApi(`/projects/${projectId}/files/${fileId}`)
  }, [projectId, mutate])

  const refresh = useCallback(async () => {
    await mutate()
  }, [mutate])

  return {
    files,
    isLoading,
    error: error ?? null,
    uploadFiles,
    removeFile,
    refresh,
  }
}

/**
 * Invalidate file caches for a project
 */
export function invalidateProjectFiles(projectId: string) {
  globalMutate(`/api/projects/${projectId}/files`)
}

// Helper converter
function fileToResponse(file: ProjectFile): ProjectFileResponse {
  return {
    id: file.id,
    project_id: "",
    name: file.name,
    size: file.size,
    type: file.type,
    category: file.category,
    url: file.url || null,
    created_at: new Date().toISOString(),
  }
}
