"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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

/**
 * Hook for polling indexing status using setInterval
 * More reliable than SWR's refreshInterval for this use case
 * 
 * @param projectId - The Supabase project UUID (not the ai_project_id)
 */
export function useIndexingStatus(
  projectId: string | null | undefined
): UseIndexingStatusReturn {
  const [data, setData] = useState<IndexingStatusResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  const fetchStatus = useCallback(async () => {
    if (!projectId) return

    try {
      setIsLoading(true)
      console.log(`🔄 Polling status for ${projectId}...`)

      const response = await fetch(`/api/projects/${projectId}/index/status`)

      if (!isMountedRef.current) return

      if (!response.ok) {
        setError("Failed to fetch status")
        return
      }

      const result: IndexingStatusResponse = await response.json()
      console.log(`📊 Status: ${result.status} ${result.percent}% - ${result.step || result.phase}`)

      setData(result)
      setError(null)

      // Stop polling if completed, error, or cancelled
      if (result.status === "completed" || result.status === "error" || result.status === "cancelled") {
        console.log(`✅ Polling stopped: ${result.status}`)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error("❌ Status fetch error:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [projectId])

  // Start polling when projectId changes
  useEffect(() => {
    isMountedRef.current = true

    if (!projectId) {
      setData(null)
      return
    }

    // Fetch immediately
    fetchStatus()

    // Start polling every 2 seconds
    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL)
    console.log(`🚀 Started polling for ${projectId}`)

    return () => {
      isMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        console.log(`🛑 Stopped polling for ${projectId}`)
      }
    }
  }, [projectId, fetchStatus])

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
    error: data?.error ?? error ?? null,
    isActive,
    isComplete,
    hasError,
    isCancelled,
    isLoading,
    refresh: fetchStatus,
  }
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
