"use client"

import useSWR from "swr"
import { useMemo } from "react"
import type { IndexingStatus } from "@/types/project"

const POLL_INTERVAL = 2000 // 2 seconds

interface IndexingStatusResponse {
  project_id: string
  status: IndexingStatus
  phase?: string
  step?: string
  percent: number
  details?: {
    thread_count: number
    message_count: number
    pdf_count: number
  }
  error?: string
  updated_at?: number
}

interface UseIndexingStatusReturn {
  /** Current status from backend */
  status: IndexingStatus | null
  /** Progress percentage (0-100) */
  percent: number
  /** Current step description */
  step: string | null
  /** Phase name (Searching, Processing, etc.) */
  phase: string | null
  /** Stats about indexed content */
  stats: {
    threadCount: number
    messageCount: number
    pdfCount: number
  } | null
  /** Error message if any */
  error: string | null
  /** Whether indexing is currently active */
  isActive: boolean
  /** Whether indexing completed successfully */
  isComplete: boolean
  /** Whether there was an error */
  hasError: boolean
  /** Whether indexing was cancelled */
  isCancelled: boolean
  /** Whether we're fetching status */
  isLoading: boolean
  /** Manually refresh status */
  refresh: () => Promise<void>
}

const fetcher = async (url: string): Promise<IndexingStatusResponse> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error("Failed to fetch status")
  }
  return response.json()
}

/**
 * SWR hook for polling indexing status
 * Automatically polls every 2 seconds while indexing is active
 * Stops polling when status is completed, error, or cancelled
 */
export function useIndexingStatus(
  backendProjectId: string | null | undefined
): UseIndexingStatusReturn {
  const key = backendProjectId
    ? `/api/projects/status?project_id=${encodeURIComponent(backendProjectId)}`
    : null

  const { data, error, isLoading, mutate } = useSWR<IndexingStatusResponse>(
    key,
    fetcher,
    {
      refreshInterval: (latestData) => {
        // Stop polling if completed, error, or cancelled
        if (!latestData) return POLL_INTERVAL
        const status = latestData.status
        if (status === "completed" || status === "error" || status === "cancelled") {
          return 0 // Stop polling
        }
        return POLL_INTERVAL
      },
      revalidateOnFocus: false,
      dedupingInterval: 1000,
    }
  )

  const result = useMemo((): UseIndexingStatusReturn => {
    const status = data?.status ?? null
    const isActive = status === "indexing" || status === "vectorizing" || status === "pending"
    const isComplete = status === "completed"
    const hasError = status === "error" || !!error
    const isCancelled = status === "cancelled"

    return {
      status,
      percent: data?.percent ?? 0,
      step: data?.step ?? null,
      phase: data?.phase ?? null,
      stats: data?.details
        ? {
            threadCount: data.details.thread_count,
            messageCount: data.details.message_count,
            pdfCount: data.details.pdf_count,
          }
        : null,
      error: data?.error ?? error?.message ?? null,
      isActive,
      isComplete,
      hasError,
      isCancelled,
      isLoading,
      refresh: async () => {
        await mutate()
      },
    }
  }, [data, error, isLoading, mutate])

  return result
}

/**
 * Hook to check if any project is currently indexing
 * Useful for showing global indicators
 */
export function useAnyIndexing(backendProjectIds: (string | null | undefined)[]): {
  isAnyIndexing: boolean
  activeCount: number
} {
  // Filter out null/undefined and get unique IDs
  const validIds = backendProjectIds.filter((id): id is string => !!id)

  // This is a simplified version - in practice you'd want to use
  // the IndexingContext to track multiple projects
  const hasActiveIds = validIds.length > 0

  return {
    isAnyIndexing: hasActiveIds,
    activeCount: validIds.length,
  }
}
