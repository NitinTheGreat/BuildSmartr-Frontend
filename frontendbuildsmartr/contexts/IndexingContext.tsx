"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import type { ProjectIndexingState } from "@/types/project"
import {
    saveIndexingState,
    getAllIndexingStates,
    clearIndexingState
} from "@/utils/indexeddb"

interface IndexingContextType {
    indexingStates: Record<string, ProjectIndexingState>
    startIndexing: (projectId: string, projectName: string) => Promise<void>
    cancelIndexing: (projectId: string) => Promise<void>
    updateProgress: (projectId: string, percent: number, step: string, stats?: ProjectIndexingState['stats']) => void
    completeIndexing: (projectId: string, stats?: ProjectIndexingState['stats']) => void
    setError: (projectId: string, error: string) => void
    dismissIndexing: (projectId: string) => void
    isAnyIndexing: boolean
    activeIndexingCount: number
}

const IndexingContext = createContext<IndexingContextType | undefined>(undefined)
const POLL_INTERVAL = 2000

export function IndexingProvider({ children }: { children: ReactNode }) {
    const [indexingStates, setIndexingStates] = useState<Record<string, ProjectIndexingState>>({})
    const pollingIntervalsRef = useRef<Record<string, NodeJS.Timeout>>({})

    useEffect(() => {
        async function loadStates() {
            try {
                const states = await getAllIndexingStates()
                const relevantStates: Record<string, ProjectIndexingState> = {}
                const now = Date.now()
                const ONE_HOUR = 60 * 60 * 1000

                for (const [id, state] of Object.entries(states)) {
                    if (state.status === 'indexing' || state.status === 'vectorizing' || state.status === 'pending' || state.status === 'cancelling') {
                        if (now - state.startedAt > ONE_HOUR) {
                            relevantStates[id] = { ...state, status: 'error', error: 'Indexing timed out' }
                        } else {
                            // Fetch project name from backend if missing
                            let projectName = state.projectName
                            if (!projectName && state.backendProjectId) {
                                try {
                                    const response = await fetch(`/api/projects/details?project_id=${encodeURIComponent(state.backendProjectId)}`)
                                    if (response.ok) {
                                        const data = await response.json()
                                        projectName = data.project_name || state.projectName
                                    }
                                } catch {
                                    // Use existing if fetch fails
                                }
                            }
                            relevantStates[id] = { ...state, projectName: projectName || 'Unknown Project' }
                            if (state.backendProjectId) {
                                setTimeout(() => startPolling(id, state.backendProjectId!), 500)
                            }
                        }
                    } else if ((state.status === 'completed' || state.status === 'cancelled') && state.completedAt && now - state.completedAt < 5 * 60 * 1000) {
                        relevantStates[id] = state
                    }
                }

                if (Object.keys(relevantStates).length > 0) {
                    setIndexingStates(relevantStates)
                }
            } catch (err) {
                // Silent
            }
        }
        loadStates()
        return () => {
            Object.values(pollingIntervalsRef.current).forEach(interval => clearInterval(interval))
        }
    }, [])

    const startPolling = useCallback((projectId: string, backendProjectId: string) => {
        if (pollingIntervalsRef.current[projectId]) {
            clearInterval(pollingIntervalsRef.current[projectId])
        }

        const poll = async () => {
            try {
                const response = await fetch(`/api/projects/status?project_id=${encodeURIComponent(backendProjectId)}`)
                const data = await response.json()

                console.log(`📊 POLL | status=${data.status} | percent=${data.percent}% | step="${data.step}"`)

                if (data.status === 'completed' || data.percent >= 100) {
                    console.log('✅ COMPLETED!')
                    clearInterval(pollingIntervalsRef.current[projectId])
                    delete pollingIntervalsRef.current[projectId]
                    setIndexingStates(prev => {
                        const current = prev[projectId]
                        if (!current) return prev
                        const updated: ProjectIndexingState = {
                            ...current,
                            status: 'completed',
                            percent: 100,
                            currentStep: data.step || 'Your project is ready!',
                            completedAt: Date.now(),
                            stats: data.details || current.stats
                        }
                        saveIndexingState(updated).catch(() => { })
                        return { ...prev, [projectId]: updated }
                    })
                    return
                }

                if (data.status === 'error') {
                    console.log('❌ ERROR:', data.error)
                    clearInterval(pollingIntervalsRef.current[projectId])
                    delete pollingIntervalsRef.current[projectId]
                    setIndexingStates(prev => {
                        const current = prev[projectId]
                        if (!current) return prev
                        const updated: ProjectIndexingState = {
                            ...current,
                            status: 'error',
                            error: data.error || 'Indexing failed'
                        }
                        saveIndexingState(updated).catch(() => { })
                        return { ...prev, [projectId]: updated }
                    })
                    return
                }

                if (data.status === 'cancelled') {
                    console.log('🛑 CANCELLED!')
                    clearInterval(pollingIntervalsRef.current[projectId])
                    delete pollingIntervalsRef.current[projectId]
                    setIndexingStates(prev => {
                        const current = prev[projectId]
                        if (!current) return prev
                        const updated: ProjectIndexingState = {
                            ...current,
                            status: 'cancelled',
                            currentStep: 'Sync cancelled',
                            completedAt: Date.now()
                        }
                        saveIndexingState(updated).catch(() => { })
                        return { ...prev, [projectId]: updated }
                    })
                    return
                }

                setIndexingStates(prev => {
                    const current = prev[projectId]
                    if (!current) return prev
                    const updated: ProjectIndexingState = {
                        ...current,
                        status: data.status || current.status,
                        phase: data.phase,
                        percent: data.percent ?? current.percent,
                        currentStep: data.step || current.currentStep,
                        stats: data.details || current.stats,
                        backendProjectId: data.project_id || current.backendProjectId
                    }
                    saveIndexingState(updated).catch(() => { })
                    return { ...prev, [projectId]: updated }
                })
            } catch (err) {
                console.log('⚠️ Poll error:', err)
            }
        }

        poll()
        pollingIntervalsRef.current[projectId] = setInterval(poll, POLL_INTERVAL)
    }, [])

    const startIndexing = useCallback(async (projectId: string, projectName: string) => {
        console.log(`🚀 START INDEXING | name="${projectName}"`)

        const newState: ProjectIndexingState = {
            projectId,
            projectName,
            status: 'indexing',
            percent: 0,
            currentStep: 'Generating project ID...',
            startedAt: Date.now(),
        }

        setIndexingStates(prev => ({ ...prev, [projectId]: newState }))
        await saveIndexingState(newState)

        try {
            // Step 1: Get the project_id with hash FIRST (this is quick!)
            console.log('📡 Step 1: Calling /api/projects/generate-id...')
            const idResponse = await fetch('/api/projects/generate-id', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_name: projectName })
            })

            if (!idResponse.ok) {
                const errorData = await idResponse.json().catch(() => ({ error: 'Failed to generate ID' }))
                console.log('❌ Generate ID failed:', idResponse.status)
                setError(projectId, errorData.error || 'Failed to generate project ID')
                return
            }

            const idResult = await idResponse.json()
            const backendProjectId = idResult.project_id

            if (!backendProjectId) {
                console.log('❌ No project_id in response!')
                setError(projectId, 'No project_id from backend')
                return
            }

            console.log(`📌 Got project_id with hash: ${backendProjectId}`)

            // Save the correct project_id
            setIndexingStates(prev => {
                const current = prev[projectId]
                if (!current) return prev
                return { ...prev, [projectId]: { ...current, backendProjectId, currentStep: 'Starting email search...' } }
            })

            // Step 2: Start polling IMMEDIATELY with the correct project_id
            console.log(`📊 Step 2: Starting polling with: ${backendProjectId}`)
            startPolling(projectId, backendProjectId)

            // Step 3: Fire index_and_vectorize in BACKGROUND (don't await!)
            console.log('📡 Step 3: Firing /api/projects/index in BACKGROUND...')
            fetch('/api/projects/index', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_name: projectName })
            }).then(response => {
                console.log('✅ Index API returned:', response.status)
            }).catch(err => {
                console.log('⚠️ Index API error (but polling continues):', err)
            })

        } catch (err) {
            console.log('❌ Error:', err)
            setError(projectId, err instanceof Error ? err.message : 'Connection error')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startPolling])

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
            saveIndexingState(updated).catch(() => { })
            return { ...prev, [projectId]: updated }
        })
    }, [])

    const completeIndexing = useCallback((projectId: string, stats?: ProjectIndexingState['stats']) => {
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
                currentStep: 'Your project is ready!',
                completedAt: Date.now(),
                stats: stats || current.stats
            }
            saveIndexingState(updated).catch(() => { })
            return { ...prev, [projectId]: updated }
        })
    }, [])

    const setError = useCallback((projectId: string, error: string) => {
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
            saveIndexingState(updated).catch(() => { })
            return { ...prev, [projectId]: updated }
        })
    }, [])

    const cancelIndexing = useCallback(async (projectId: string) => {
        const state = indexingStates[projectId]
        if (!state?.backendProjectId) {
            console.log('⚠️ No backend project ID to cancel')
            dismissIndexing(projectId)
            return
        }

        console.log(`🛑 CANCELLING | projectId="${projectId}" | backendId="${state.backendProjectId}"`)

        // Update state to "cancelling"
        setIndexingStates(prev => {
            const current = prev[projectId]
            if (!current) return prev
            const updated: ProjectIndexingState = {
                ...current,
                status: 'cancelling',
                currentStep: 'Cancelling sync...'
            }
            saveIndexingState(updated).catch(() => { })
            return { ...prev, [projectId]: updated }
        })

        try {
            // Call the cancel endpoint
            const response = await fetch(
                `/api/projects/cancel-indexing?project_id=${encodeURIComponent(state.backendProjectId)}`,
                { method: 'POST' }
            )

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Cancel failed' }))
                console.log('❌ Cancel failed:', error)
                setError(projectId, error.error || 'Failed to cancel sync')
                return
            }

            console.log('✅ Cancel request sent, continuing to poll for cancelled status...')
            // The polling will continue and eventually receive 'cancelled' status from backend
        } catch (err) {
            console.log('❌ Cancel error:', err)
            setError(projectId, err instanceof Error ? err.message : 'Failed to cancel sync')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [indexingStates, setError])

    const dismissIndexing = useCallback((projectId: string) => {
        if (pollingIntervalsRef.current[projectId]) {
            clearInterval(pollingIntervalsRef.current[projectId])
            delete pollingIntervalsRef.current[projectId]
        }
        setIndexingStates(prev => {
            const { [projectId]: _, ...rest } = prev
            return rest
        })
        clearIndexingState(projectId).catch(() => { })
    }, [])

    const isAnyIndexing = Object.values(indexingStates).some(
        s => s.status === 'indexing' || s.status === 'vectorizing' || s.status === 'cancelling'
    )
    const activeIndexingCount = Object.values(indexingStates).filter(
        s => s.status === 'indexing' || s.status === 'vectorizing' || s.status === 'cancelling'
    ).length

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
            {children}
        </IndexingContext.Provider>
    )
}

export function useIndexing() {
    const context = useContext(IndexingContext)
    if (context === undefined) {
        throw new Error('useIndexing must be used within an IndexingProvider')
    }
    return context
}
