"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import type { ProjectIndexingState } from "@/types/project"
import {
    saveIndexingState,
    getAllIndexingStates,
    clearIndexingState
} from "@/utils/indexeddb"

// ============================================
// Context Types
// ============================================

interface IndexingContextType {
    indexingStates: Record<string, ProjectIndexingState>
    startIndexing: (projectId: string, projectName: string) => Promise<void>
    updateProgress: (projectId: string, percent: number, step: string, stats?: ProjectIndexingState['stats']) => void
    completeIndexing: (projectId: string, stats?: ProjectIndexingState['stats']) => void
    setError: (projectId: string, error: string) => void
    dismissIndexing: (projectId: string) => void
    isAnyIndexing: boolean
    activeIndexingCount: number
}

const IndexingContext = createContext<IndexingContextType | undefined>(undefined)

// Polling configuration
const POLL_INTERVAL = 1500 // 1.5 seconds
const MAX_POLL_ATTEMPTS = 600 // Max 15 minutes

// ============================================
// Provider Component
// ============================================

export function IndexingProvider({ children }: { children: ReactNode }) {
    const [indexingStates, setIndexingStates] = useState<Record<string, ProjectIndexingState>>({})
    const workerRef = useRef<Worker | null>(null)
    const pollingIntervalsRef = useRef<Record<string, NodeJS.Timeout>>({})

    // Poll status for a specific project (fallback when worker not available or for reconnection)
    const pollProjectStatus = useCallback(async (projectId: string, projectName: string) => {
        let attempts = 0

        const poll = async () => {
            attempts++

            if (attempts > MAX_POLL_ATTEMPTS) {
                setError(projectId, 'Indexing timed out')
                return
            }

            try {
                const response = await fetch(`/api/projects/status?project_id=${encodeURIComponent(projectId)}`)

                if (!response.ok) {
                    throw new Error('Failed to get status')
                }

                const data = await response.json()

                if (data.status === 'completed') {
                    // Stop polling and mark as complete
                    if (pollingIntervalsRef.current[projectId]) {
                        clearInterval(pollingIntervalsRef.current[projectId])
                        delete pollingIntervalsRef.current[projectId]
                    }

                    completeIndexing(projectId, data.details)
                    return
                }

                if (data.status === 'not_found') {
                    // Project not found - might have completed or never started
                    if (attempts > 5) {
                        if (pollingIntervalsRef.current[projectId]) {
                            clearInterval(pollingIntervalsRef.current[projectId])
                            delete pollingIntervalsRef.current[projectId]
                        }

                        // If we had significant progress, assume completed
                        const currentState = indexingStates[projectId]
                        if (currentState && currentState.percent > 50) {
                            completeIndexing(projectId)
                        } else {
                            setError(projectId, 'Indexing status not found')
                        }
                    }
                    return
                }

                if (data.status === 'error') {
                    if (pollingIntervalsRef.current[projectId]) {
                        clearInterval(pollingIntervalsRef.current[projectId])
                        delete pollingIntervalsRef.current[projectId]
                    }
                    setError(projectId, data.error || 'Indexing failed')
                    return
                }

                // Update progress
                updateProgress(projectId, data.percent || 0, data.step || 'Processing...', data.details)

            } catch (err) {
                console.error('[IndexingContext] Poll error:', err)
                // Continue polling on transient errors
            }
        }

        // Start polling
        poll()
        pollingIntervalsRef.current[projectId] = setInterval(poll, POLL_INTERVAL)
    }, [indexingStates])

    // Load persisted states on mount and resume polling for in-progress states
    useEffect(() => {
        async function loadStates() {
            try {
                const states = await getAllIndexingStates()
                const relevantStates: Record<string, ProjectIndexingState> = {}
                const now = Date.now()
                const ONE_HOUR = 60 * 60 * 1000

                for (const [id, state] of Object.entries(states)) {
                    if (state.status === 'indexing' || state.status === 'pending') {
                        if (now - state.startedAt > ONE_HOUR) {
                            relevantStates[id] = { ...state, status: 'error', error: 'Indexing timed out' }
                        } else {
                            relevantStates[id] = state
                            // Resume polling for in-progress states (when worker is not available)
                            // The worker will handle this if it's running
                        }
                    } else if (state.status === 'completed' && state.completedAt && now - state.completedAt < 5 * 60 * 1000) {
                        relevantStates[id] = state
                    }
                }

                if (Object.keys(relevantStates).length > 0) {
                    setIndexingStates(relevantStates)
                }
            } catch (err) {
                console.error("[IndexingContext] Failed to load states:", err)
            }
        }

        loadStates()
    }, [])

    // Initialize Web Worker
    useEffect(() => {
        if (typeof window !== 'undefined' && window.Worker) {
            workerRef.current = new Worker('/workers/indexing-worker.js')

            workerRef.current.onmessage = (event) => {
                const { type, projectId, percent, step, stats, error, result } = event.data

                switch (type) {
                    case 'progress':
                        updateProgress(projectId, percent, step, stats)
                        break
                    case 'complete':
                        completeIndexing(projectId, result?.stats)
                        break
                    case 'error':
                        setError(projectId, error)
                        break
                }
            }

            workerRef.current.onerror = (err) => {
                console.error("[IndexingContext] Worker error:", err)
            }
        }

        return () => {
            workerRef.current?.terminate()
            // Clear all polling intervals on unmount
            Object.values(pollingIntervalsRef.current).forEach(interval => clearInterval(interval))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const startIndexing = useCallback(async (projectId: string, projectName: string) => {
        const newState: ProjectIndexingState = {
            projectId,
            projectName,
            status: 'indexing',
            percent: 0,
            currentStep: 'Starting email search...',
            startedAt: Date.now(),
        }

        setIndexingStates(prev => ({ ...prev, [projectId]: newState }))
        await saveIndexingState(newState)

        // Start the worker
        if (workerRef.current) {
            workerRef.current.postMessage({
                type: 'start',
                projectId,
                projectName,
                apiUrl: '/api/projects/index'
            })
        } else {
            // Fallback: Start indexing and poll for status
            try {
                const response = await fetch('/api/projects/index', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ project_name: projectName })
                })

                if (!response.ok) {
                    const data = await response.json().catch(() => ({ error: 'Request failed' }))
                    throw new Error(data.error || 'Indexing failed')
                }

                const result = await response.json()
                const normalizedProjectId = result.project_id || projectId

                // Start polling for status updates
                pollProjectStatus(normalizedProjectId, projectName)

            } catch (err) {
                setError(projectId, err instanceof Error ? err.message : 'Indexing failed')
            }
        }
    }, [pollProjectStatus])

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
                stats: stats || current.stats
            }

            // Persist to IndexedDB
            saveIndexingState(updated).catch(console.error)

            return { ...prev, [projectId]: updated }
        })
    }, [])

    const completeIndexing = useCallback((projectId: string, stats?: ProjectIndexingState['stats']) => {
        // Stop any polling for this project
        if (pollingIntervalsRef.current[projectId]) {
            clearInterval(pollingIntervalsRef.current[projectId])
            delete pollingIntervalsRef.current[projectId]
        }

        setIndexingStates(prev => {
            const current = prev[projectId]
            if (!current) return prev

            const updated: ProjectIndexingState = {
                ...current,
                status: 'completed',
                percent: 100,
                currentStep: 'All done! Your project is ready.',
                completedAt: Date.now(),
                stats: stats || current.stats
            }

            saveIndexingState(updated).catch(console.error)

            return { ...prev, [projectId]: updated }
        })
    }, [])

    const setError = useCallback((projectId: string, error: string) => {
        // Stop any polling for this project
        if (pollingIntervalsRef.current[projectId]) {
            clearInterval(pollingIntervalsRef.current[projectId])
            delete pollingIntervalsRef.current[projectId]
        }

        setIndexingStates(prev => {
            const current = prev[projectId]
            if (!current) return prev

            const updated: ProjectIndexingState = {
                ...current,
                status: 'error',
                error
            }

            saveIndexingState(updated).catch(console.error)

            return { ...prev, [projectId]: updated }
        })
    }, [])

    const dismissIndexing = useCallback((projectId: string) => {
        // Stop any polling for this project
        if (pollingIntervalsRef.current[projectId]) {
            clearInterval(pollingIntervalsRef.current[projectId])
            delete pollingIntervalsRef.current[projectId]
        }

        setIndexingStates(prev => {
            const { [projectId]: _, ...rest } = prev
            return rest
        })
        clearIndexingState(projectId).catch(console.error)
    }, [])

    const isAnyIndexing = Object.values(indexingStates).some(s => s.status === 'indexing')
    const activeIndexingCount = Object.values(indexingStates).filter(s => s.status === 'indexing').length

    return (
        <IndexingContext.Provider value={{
            indexingStates,
            startIndexing,
            updateProgress,
            completeIndexing,
            setError,
            dismissIndexing,
            isAnyIndexing,
            activeIndexingCount,
        }}>
            {children}
        </IndexingContext.Provider>
    )
}

// ============================================
// Hook
// ============================================

export function useIndexing() {
    const context = useContext(IndexingContext)
    if (context === undefined) {
        throw new Error('useIndexing must be used within an IndexingProvider')
    }
    return context
}
