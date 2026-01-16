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

// Configuration
const POLL_INTERVAL = 1500 // Poll backend every 1.5 seconds
const ANIMATION_INTERVAL = 50 // Animate progress every 50ms
const TRICKLE_RATE = 0.15 // Slow trickle when waiting for updates
const CATCH_UP_RATE = 0.08 // Speed to catch up to target (0-1, higher = faster)

// Normalize project ID to match backend format
function normalizeProjectId(projectName: string): string {
    return projectName
        .toLowerCase()
        .replace(/[\s\-]+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .trim()
}

// ============================================
// Provider Component
// ============================================

export function IndexingProvider({ children }: { children: ReactNode }) {
    const [indexingStates, setIndexingStates] = useState<Record<string, ProjectIndexingState>>({})
    const pollingIntervalsRef = useRef<Record<string, NodeJS.Timeout>>({})
    const animationIntervalsRef = useRef<Record<string, NodeJS.Timeout>>({})
    const targetPercentsRef = useRef<Record<string, number>>({})

    // Load persisted states on mount
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

        // Cleanup on unmount
        return () => {
            Object.values(pollingIntervalsRef.current).forEach(interval => clearInterval(interval))
            Object.values(animationIntervalsRef.current).forEach(interval => clearInterval(interval))
        }
    }, [])

    // Start smooth animation for a project
    const startAnimation = useCallback((projectId: string) => {
        if (animationIntervalsRef.current[projectId]) {
            clearInterval(animationIntervalsRef.current[projectId])
        }

        animationIntervalsRef.current[projectId] = setInterval(() => {
            setIndexingStates(prev => {
                const current = prev[projectId]
                if (!current || current.status !== 'indexing') return prev

                const targetPercent = targetPercentsRef.current[projectId] ?? current.percent
                let newPercent = current.percent

                if (current.percent < targetPercent) {
                    // Catch up to target with easing
                    const diff = targetPercent - current.percent
                    newPercent = current.percent + Math.max(0.5, diff * CATCH_UP_RATE)
                    newPercent = Math.min(newPercent, targetPercent)
                } else if (current.percent < 99 && current.percent >= targetPercent) {
                    // Slow trickle when we've caught up (but cap at 99)
                    newPercent = Math.min(99, current.percent + TRICKLE_RATE)
                }

                // Don't update if no change
                if (Math.abs(newPercent - current.percent) < 0.1) return prev

                return {
                    ...prev,
                    [projectId]: { ...current, percent: newPercent }
                }
            })
        }, ANIMATION_INTERVAL)
    }, [])

    // Stop animation for a project
    const stopAnimation = useCallback((projectId: string) => {
        if (animationIntervalsRef.current[projectId]) {
            clearInterval(animationIntervalsRef.current[projectId])
            delete animationIntervalsRef.current[projectId]
        }
    }, [])

    // Start polling for a project
    const startPolling = useCallback((projectId: string, normalizedId: string) => {
        console.log('[IndexingContext] Starting polling for:', normalizedId)

        if (pollingIntervalsRef.current[projectId]) {
            clearInterval(pollingIntervalsRef.current[projectId])
        }

        const poll = async () => {
            try {
                const response = await fetch(`/api/projects/status?project_id=${encodeURIComponent(normalizedId)}`)
                const data = await response.json()

                console.log('[IndexingContext] Poll:', data.status, data.percent + '%', data.step)

                if (data.status === 'completed' || data.percent >= 100) {
                    clearInterval(pollingIntervalsRef.current[projectId])
                    delete pollingIntervalsRef.current[projectId]
                    stopAnimation(projectId)
                    completeIndexing(projectId, data.details)
                    return
                }

                if (data.status === 'error') {
                    clearInterval(pollingIntervalsRef.current[projectId])
                    delete pollingIntervalsRef.current[projectId]
                    stopAnimation(projectId)
                    setError(projectId, data.error || 'Indexing failed')
                    return
                }

                if (data.status === 'indexing') {
                    // Update target percent (animation will smoothly catch up)
                    targetPercentsRef.current[projectId] = data.percent || 0

                    // Update step and stats immediately
                    setIndexingStates(prev => {
                        const current = prev[projectId]
                        if (!current) return prev
                        return {
                            ...prev,
                            [projectId]: {
                                ...current,
                                currentStep: data.step || current.currentStep,
                                stats: data.details || current.stats
                            }
                        }
                    })
                }

            } catch (err) {
                console.error('[IndexingContext] Poll error:', err)
            }
        }

        poll()
        pollingIntervalsRef.current[projectId] = setInterval(poll, POLL_INTERVAL)
    }, [stopAnimation])

    const startIndexing = useCallback(async (projectId: string, projectName: string) => {
        const normalizedId = normalizeProjectId(projectName)

        console.log('[IndexingContext] Starting indexing for:', projectName, '→', normalizedId)

        const newState: ProjectIndexingState = {
            projectId,
            projectName,
            status: 'indexing',
            percent: 0,
            currentStep: 'Starting email search...',
            startedAt: Date.now(),
        }

        targetPercentsRef.current[projectId] = 0
        setIndexingStates(prev => ({ ...prev, [projectId]: newState }))
        await saveIndexingState(newState)

        // Fire index request (don't await!)
        fetch('/api/projects/index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_name: projectName })
        }).then(response => {
            console.log('[IndexingContext] Index request completed:', response.status)
        }).catch(err => {
            console.error('[IndexingContext] Index request failed:', err)
            setError(projectId, err.message || 'Indexing failed')
        })

        // Start animation immediately (smooth progress)
        startAnimation(projectId)

        // Start polling after small delay
        setTimeout(() => {
            startPolling(projectId, normalizedId)
        }, 300)

    }, [startAnimation, startPolling])

    const updateProgress = useCallback((
        projectId: string,
        percent: number,
        step: string,
        stats?: ProjectIndexingState['stats']
    ) => {
        targetPercentsRef.current[projectId] = percent

        setIndexingStates(prev => {
            const current = prev[projectId]
            if (!current) return prev

            const updated: ProjectIndexingState = {
                ...current,
                currentStep: step,
                stats: stats || current.stats
            }

            saveIndexingState({ ...updated, percent }).catch(console.error)

            return { ...prev, [projectId]: updated }
        })
    }, [])

    const completeIndexing = useCallback((projectId: string, stats?: ProjectIndexingState['stats']) => {
        stopAnimation(projectId)

        if (pollingIntervalsRef.current[projectId]) {
            clearInterval(pollingIntervalsRef.current[projectId])
            delete pollingIntervalsRef.current[projectId]
        }

        delete targetPercentsRef.current[projectId]

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
    }, [stopAnimation])

    const setError = useCallback((projectId: string, error: string) => {
        stopAnimation(projectId)

        if (pollingIntervalsRef.current[projectId]) {
            clearInterval(pollingIntervalsRef.current[projectId])
            delete pollingIntervalsRef.current[projectId]
        }

        delete targetPercentsRef.current[projectId]

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
    }, [stopAnimation])

    const dismissIndexing = useCallback((projectId: string) => {
        stopAnimation(projectId)

        if (pollingIntervalsRef.current[projectId]) {
            clearInterval(pollingIntervalsRef.current[projectId])
            delete pollingIntervalsRef.current[projectId]
        }

        delete targetPercentsRef.current[projectId]

        setIndexingStates(prev => {
            const { [projectId]: _, ...rest } = prev
            return rest
        })
        clearIndexingState(projectId).catch(console.error)
    }, [stopAnimation])

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
