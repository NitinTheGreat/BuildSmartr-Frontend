"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
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
      // Add to active jobs for polling (using projectId as backendProjectId initially)
      // The Database Backend will return the actual ai_project_id
      setActiveJobs(prev => ({
        ...prev,
        [projectId]: {
          projectId,
          projectName,
          backendProjectId: projectId, // Use project UUID, backend will map to ai_project_id
          startedAt: newState.startedAt,
        }
      }))

      // Fire indexing request to Database Backend (which handles AI backend internally)
      console.log(`📡 Calling /api/projects/${projectId}/index...`)
      const response = await fetch(`/api/projects/${projectId}/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to start indexing' }))
        throw new Error(errorData.error || errorData.message || 'Failed to start indexing')
      }

      const result = await response.json()
      console.log('✅ Index API returned:', result)

      // Update state with ai_project_id from response if available
      if (result.ai_project_id) {
        const updatedState: ProjectIndexingState = {
          ...newState,
          backendProjectId: result.ai_project_id,
          currentStep: 'Indexing in progress...',
        }
        setIndexingStates(prev => ({ ...prev, [projectId]: updatedState }))
        await saveIndexingState(updatedState)

        // Update active job with actual ai_project_id
        setActiveJobs(prev => ({
          ...prev,
          [projectId]: {
            ...prev[projectId],
            backendProjectId: result.ai_project_id,
          }
        }))
      }

    } catch (err) {
      console.log('❌ Error:', err)
      const errorState: ProjectIndexingState = {
        ...newState,
        status: 'error',
        error: err instanceof Error ? err.message : 'Connection error',
      }
      setIndexingStates(prev => ({ ...prev, [projectId]: errorState }))
      await saveIndexingState(errorState)
      
      // Remove from active jobs on error
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
      saveIndexingState(updated).catch(() => {})
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
      saveIndexingState(updated).catch(() => {})
      return { ...prev, [projectId]: updated }
    })
  }, [])

  const setError = useCallback((projectId: string, error: string) => {
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
      saveIndexingState(updated).catch(() => {})
      return { ...prev, [projectId]: updated }
    })
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
    clearIndexingState(projectId).catch(() => {})
  }, [])

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
              saveIndexingState(updated).catch(() => {})
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
              saveIndexingState(updated).catch(() => {})
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
  backendProjectId,
  onUpdate,
  onComplete,
  onError,
  onCancelled,
}: IndexingStatusPollerProps) {
  const { status, percent, step, stats, isComplete, hasError, isCancelled, error } = useIndexingStatus(backendProjectId)

  // Handle status changes
  useEffect(() => {
    if (!status) return

    if (isComplete) {
      onComplete(stats ? {
        thread_count: stats.threadCount,
        message_count: stats.messageCount,
        pdf_count: stats.pdfCount,
      } : undefined)
    } else if (hasError && error) {
      onError(error)
    } else if (isCancelled) {
      onCancelled()
    } else {
      onUpdate(status, percent, step, stats ? {
        thread_count: stats.threadCount,
        message_count: stats.messageCount,
        pdf_count: stats.pdfCount,
      } : null)
    }
  }, [status, percent, step, stats, isComplete, hasError, isCancelled, error, onUpdate, onComplete, onError, onCancelled])

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
