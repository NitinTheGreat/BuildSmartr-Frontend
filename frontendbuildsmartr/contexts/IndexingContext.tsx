"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import type { ProjectIndexingState, IndexingStatus } from "@/types/project"
import {
  saveIndexingState,
  getAllIndexingStates,
  clearIndexingState
} from "@/utils/indexeddb"
import { useIndexingStatus } from "@/hooks/useIndexingStatus"

// ============================================
// Types
// ============================================

interface IndexingJob {
  projectId: string
  projectName: string
  backendProjectId?: string
  startedAt: number
}

interface IndexingContextType {
  /** Map of project ID to indexing state (for UI display) */
  indexingStates: Record<string, ProjectIndexingState>
  /** Start indexing for a project */
  startIndexing: (projectId: string, projectName: string) => Promise<void>
  /** Cancel indexing for a project */
  cancelIndexing: (projectId: string) => Promise<void>
  /** Update progress manually (legacy support) */
  updateProgress: (projectId: string, percent: number, step: string, stats?: ProjectIndexingState['stats']) => void
  /** Mark indexing as complete (legacy support) */
  completeIndexing: (projectId: string, stats?: ProjectIndexingState['stats']) => void
  /** Set error state (legacy support) */
  setError: (projectId: string, error: string) => void
  /** Dismiss/remove indexing state from UI */
  dismissIndexing: (projectId: string) => void
  /** Restore indexing state for a project that's still indexing (after page refresh) */
  restoreIndexingState: (projectId: string, projectName: string) => void
  /** Whether any project is currently indexing */
  isAnyIndexing: boolean
  /** Count of actively indexing projects */
  activeIndexingCount: number
}

const IndexingContext = createContext<IndexingContextType | undefined>(undefined)

// ============================================
// Provider Component
// ============================================

export function IndexingProvider({ children }: { children: ReactNode }) {
  const [indexingStates, setIndexingStates] = useState<Record<string, ProjectIndexingState>>({})
  const [activeJobs, setActiveJobs] = useState<Record<string, IndexingJob>>({})

  // Load persisted states on mount
  useEffect(() => {
    async function loadStates() {
      try {
        const states = await getAllIndexingStates()
        const relevantStates: Record<string, ProjectIndexingState> = {}
        const jobs: Record<string, IndexingJob> = {}
        const now = Date.now()
        const ONE_HOUR = 60 * 60 * 1000

        for (const [id, state] of Object.entries(states)) {
          const isActive = state.status === 'indexing' || state.status === 'vectorizing' ||
            state.status === 'pending' || state.status === 'cancelling'

          if (isActive) {
            if (now - state.startedAt > ONE_HOUR) {
              // Timed out
              relevantStates[id] = { ...state, status: 'error', error: 'Indexing timed out' }
            } else {
              relevantStates[id] = state
              // Re-create job for polling
              if (state.backendProjectId) {
                jobs[id] = {
                  projectId: id,
                  projectName: state.projectName,
                  backendProjectId: state.backendProjectId,
                  startedAt: state.startedAt,
                }
              }
            }
          } else if ((state.status === 'completed' || state.status === 'cancelled') &&
            state.completedAt && now - state.completedAt < 5 * 60 * 1000) {
            // Show completed states for 5 minutes
            relevantStates[id] = state
          }
        }

        if (Object.keys(relevantStates).length > 0) {
          setIndexingStates(relevantStates)
          setActiveJobs(jobs)
        }
      } catch (err) {
        console.error("Failed to load indexing states:", err)
      }
    }
    loadStates()
  }, [])

  // ============================================
  // Start Indexing
  // ============================================

  const startIndexing = useCallback(async (projectId: string, projectName: string) => {
    console.log(`🚀 START INDEXING | projectId="${projectId}" name="${projectName}"`)

    const newState: ProjectIndexingState = {
      projectId,
      projectName,
      status: 'indexing',
      percent: 0,
      currentStep: 'Starting email indexing...',
      startedAt: Date.now(),
    }

    setIndexingStates(prev => ({ ...prev, [projectId]: newState }))
    await saveIndexingState(newState)

    try {
      // Fire indexing request to Database Backend (which handles AI backend internally)
      // IMPORTANT: Don't add to activeJobs until we confirm the request succeeded
      console.log(`📡 Calling /api/projects/${projectId}/index...`)
      const response = await fetch(`/api/projects/${projectId}/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to start indexing' }))
        // Backend returns { error: true, message: "..." } - use message, not error (which is a boolean)
        throw new Error(errorData.message || (typeof errorData.error === 'string' ? errorData.error : 'Failed to start indexing'))
      }

      const result = await response.json()
      console.log('✅ Index API returned:', result)

      // Only add to activeJobs AFTER successful response - this starts the poller
      // IMPORTANT: Use the Supabase project UUID for status polling, NOT the AI project ID
      // The status endpoint expects a UUID, not the AI backend's human-readable ID
      setActiveJobs(prev => ({
        ...prev,
        [projectId]: {
          projectId,
          projectName,
          backendProjectId: projectId, // Always use Supabase UUID for status polling
          startedAt: newState.startedAt,
        }
      }))

      // Update state - store ai_project_id for reference but use projectId for polling
      const updatedState: ProjectIndexingState = {
        ...newState,
        backendProjectId: projectId, // Use Supabase UUID for polling
        aiProjectId: result.ai_project_id, // Store AI project ID separately for reference
        currentStep: 'Indexing in progress...',
      }
      setIndexingStates(prev => ({ ...prev, [projectId]: updatedState }))
      await saveIndexingState(updatedState)

    } catch (err) {
      console.log('❌ Error:', err)
      const errorState: ProjectIndexingState = {
        ...newState,
        status: 'error',
        error: err instanceof Error ? err.message : 'Connection error',
      }
      setIndexingStates(prev => ({ ...prev, [projectId]: errorState }))
      await saveIndexingState(errorState)

      // Ensure not in active jobs (shouldn't be, but safety check)
      setActiveJobs(prev => {
        const { [projectId]: _, ...rest } = prev
        return rest
      })
    }
  }, [])

  // ============================================
  // Cancel Indexing
  // ============================================

  const cancelIndexing = useCallback(async (projectId: string) => {
    const state = indexingStates[projectId]
    if (!state) {
      console.log('⚠️ No indexing state to cancel')
      dismissIndexing(projectId)
      return
    }

    console.log(`🛑 CANCELLING | projectId="${projectId}"`)

    // Update to cancelling state
    const cancellingState: ProjectIndexingState = {
      ...state,
      status: 'cancelling',
      currentStep: 'Cancelling sync...',
    }
    setIndexingStates(prev => ({ ...prev, [projectId]: cancellingState }))
    await saveIndexingState(cancellingState)

    try {
      // Call Database Backend's cancel endpoint using project UUID
      const response = await fetch(`/api/projects/${projectId}/index/cancel`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Cancel failed' }))
        throw new Error(error.error || error.message || 'Failed to cancel sync')
      }

      console.log('✅ Cancel request sent')
    } catch (err) {
      console.log('❌ Cancel error:', err)
      setError(projectId, err instanceof Error ? err.message : 'Failed to cancel sync')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexingStates])

  // ============================================
  // Update Helpers (legacy support)
  // ============================================

  const updateProgress = useCallback((
    projectId: string,
    percent: number,
    step: string,
    stats?: ProjectIndexingState['stats']
  ) => {
    setIndexingStates(prev => {
      const current = prev[projectId]
      if (!current) return prev
      const updated: ProjectIndexingState = {
        ...current,
        percent,
        currentStep: step,
        stats: stats || current.stats,
      }
      saveIndexingState(updated).catch(() => { })
      return { ...prev, [projectId]: updated }
    })
  }, [])

  const completeIndexing = useCallback((projectId: string, stats?: ProjectIndexingState['stats']) => {
    setActiveJobs(prev => {
      const { [projectId]: _, ...rest } = prev
      return rest
    })
    setIndexingStates(prev => {
      const current = prev[projectId]
      if (!current) return prev
      const updated: ProjectIndexingState = {
        ...current,
        status: 'completed',
        percent: 100,
        currentStep: 'Your project is ready!',
        completedAt: Date.now(),
        stats: stats || current.stats,
      }
      saveIndexingState(updated).catch(() => { })
      return { ...prev, [projectId]: updated }
    })
  }, [])

  const setError = useCallback(async (projectId: string, error: string) => {
    setActiveJobs(prev => {
      const { [projectId]: _, ...rest } = prev
      return rest
    })
    setIndexingStates(prev => {
      const current = prev[projectId]
      if (!current) return prev
      const updated: ProjectIndexingState = {
        ...current,
        status: 'error',
        error,
      }
      saveIndexingState(updated).catch(() => { })
      return { ...prev, [projectId]: updated }
    })

    // Auto-delete the project from database when indexing fails
    // This prevents orphan projects that can't be used
    console.log(`🗑️ Auto-deleting failed project: ${projectId}`)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        console.log(`✅ Deleted failed project: ${projectId}`)
        // Error state will persist until user clicks "Okay" / dismisses it
      } else {
        console.log(`⚠️ Failed to delete project: ${projectId}`)
      }
    } catch (err) {
      console.log(`⚠️ Error deleting project: ${err}`)
    }
  }, [])

  const dismissIndexing = useCallback((projectId: string) => {
    setActiveJobs(prev => {
      const { [projectId]: _, ...rest } = prev
      return rest
    })
    setIndexingStates(prev => {
      const { [projectId]: _, ...rest } = prev
      return rest
    })
    clearIndexingState(projectId).catch(() => { })
  }, [])

  // Restore indexing state for a project that's still indexing (e.g., after page refresh)
  const restoreIndexingState = useCallback((projectId: string, projectName: string) => {
    // Check if we already have this project tracked
    if (indexingStates[projectId]) {
      console.log(`🔄 Project ${projectId} already being tracked`)
      return
    }

    console.log(`🔄 RESTORING indexing state | projectId="${projectId}" name="${projectName}"`)

    const restoredState: ProjectIndexingState = {
      projectId,
      projectName,
      backendProjectId: projectId,
      status: 'indexing',
      percent: 0,
      currentStep: 'Restoring indexing progress...',
      startedAt: Date.now(),
    }

    setIndexingStates(prev => ({ ...prev, [projectId]: restoredState }))
    saveIndexingState(restoredState).catch(() => { })

    // Start polling for status
    setActiveJobs(prev => ({
      ...prev,
      [projectId]: {
        projectId,
        projectName,
        backendProjectId: projectId,
        startedAt: restoredState.startedAt,
      }
    }))
  }, [indexingStates])

  // ============================================
  // Computed Values
  // ============================================

  const isAnyIndexing = Object.values(indexingStates).some(
    s => s.status === 'indexing' || s.status === 'vectorizing' || s.status === 'cancelling'
  )

  const activeIndexingCount = Object.values(indexingStates).filter(
    s => s.status === 'indexing' || s.status === 'vectorizing' || s.status === 'cancelling'
  ).length

  // ============================================
  // Render with Status Pollers
  // ============================================

  return (
    <IndexingContext.Provider value={{
      indexingStates,
      startIndexing,
      cancelIndexing,
      updateProgress,
      completeIndexing,
      setError,
      dismissIndexing,
      restoreIndexingState,
      isAnyIndexing,
      activeIndexingCount,
    }}>
      {/* Status pollers for active jobs */}
      {Object.values(activeJobs).map(job => (
        <IndexingStatusPoller
          key={job.projectId}
          projectId={job.projectId}
          backendProjectId={job.backendProjectId}
          onUpdate={(status, percent, step, stats) => {
            setIndexingStates(prev => {
              const current = prev[job.projectId]
              if (!current) return prev
              const updated: ProjectIndexingState = {
                ...current,
                status: status as ProjectIndexingState['status'],
                percent,
                currentStep: step || current.currentStep,
                stats: stats || current.stats,
              }
              saveIndexingState(updated).catch(() => { })
              return { ...prev, [job.projectId]: updated }
            })
          }}
          onComplete={(stats) => completeIndexing(job.projectId, stats)}
          onError={(error) => setError(job.projectId, error)}
          onCancelled={() => {
            setActiveJobs(prev => {
              const { [job.projectId]: _, ...rest } = prev
              return rest
            })
            setIndexingStates(prev => {
              const current = prev[job.projectId]
              if (!current) return prev
              const updated: ProjectIndexingState = {
                ...current,
                status: 'cancelled',
                currentStep: 'Sync cancelled',
                completedAt: Date.now(),
              }
              saveIndexingState(updated).catch(() => { })
              return { ...prev, [job.projectId]: updated }
            })
          }}
        />
      ))}
      {children}
    </IndexingContext.Provider>
  )
}

// ============================================
// Status Poller Component (uses SWR hook)
// ============================================

interface IndexingStatusPollerProps {
  projectId: string
  backendProjectId?: string
  onUpdate: (status: IndexingStatus, percent: number, step: string | null, stats: ProjectIndexingState['stats'] | null) => void
  onComplete: (stats?: ProjectIndexingState['stats']) => void
  onError: (error: string) => void
  onCancelled: () => void
}

function IndexingStatusPoller({
  projectId,
  backendProjectId,
  onUpdate,
  onComplete,
  onError,
  onCancelled,
}: IndexingStatusPollerProps) {
  const { status, percent, step, stats, isComplete, hasError, isCancelled, error } = useIndexingStatus(backendProjectId)

  // Use refs to avoid infinite loops - callbacks change every render but refs are stable
  const onUpdateRef = useRef(onUpdate)
  const onCompleteRef = useRef(onComplete)
  const onErrorRef = useRef(onError)
  const onCancelledRef = useRef(onCancelled)

  // Keep refs up to date
  useEffect(() => {
    onUpdateRef.current = onUpdate
    onCompleteRef.current = onComplete
    onErrorRef.current = onError
    onCancelledRef.current = onCancelled
  })

  // Track last status to avoid duplicate calls
  const lastStatusRef = useRef<string | null>(null)

  // Handle status changes
  useEffect(() => {
    if (!status) return

    // Create a status key to detect real changes
    const statusKey = `${status}-${percent}-${isComplete}-${hasError}-${isCancelled}`
    if (statusKey === lastStatusRef.current) return
    lastStatusRef.current = statusKey

    if (isComplete) {
      onCompleteRef.current(stats ? {
        thread_count: stats.threadCount,
        message_count: stats.messageCount,
        pdf_count: stats.pdfCount,
      } : undefined)
    } else if (hasError && error) {
      onErrorRef.current(error)
    } else if (isCancelled) {
      onCancelledRef.current()
    } else {
      onUpdateRef.current(status, percent, step, stats ? {
        thread_count: stats.threadCount,
        message_count: stats.messageCount,
        pdf_count: stats.pdfCount,
      } : null)
    }
  }, [status, percent, step, stats, isComplete, hasError, isCancelled, error])

  return null // This is a headless component
}

// ============================================
// Hook Export
// ============================================

export function useIndexing() {
  const context = useContext(IndexingContext)
  if (context === undefined) {
    throw new Error('useIndexing must be used within an IndexingProvider')
  }
  return context
}
