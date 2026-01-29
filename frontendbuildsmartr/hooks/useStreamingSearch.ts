"use client"

import { useState, useCallback, useRef } from 'react'
import type {
    StreamingEventType,
    StreamingSearchState,
    ThinkingEventData,
    SourcesEventData,
    ChunkEventData,
    DoneEventData,
    ErrorEventData,
    SourceItem,
} from '@/types/streaming'

// AI Backend URL - called directly for streaming (bypasses Database Backend buffering)
const AI_BACKEND_URL = process.env.NEXT_PUBLIC_AI_BACKEND_URL || 'http://localhost:7071'

const initialState: StreamingSearchState = {
    isStreaming: false,
    thinkingStatus: null,
    sources: [],
    chunksRetrieved: 0,
    streamedContent: '',
    error: null,
    stats: null,
}

// Return type for streamSearch - includes both content and sources
export interface StreamSearchResult {
    content: string
    sources: SourceItem[]
}

interface UseStreamingSearchReturn extends StreamingSearchState {
    streamSearch: (projectId: string, question: string, topK?: number) => Promise<StreamSearchResult>
    abort: () => void
    reset: () => void
}

/**
 * Hook for handling SSE streaming search requests
 * 
 * ARCHITECTURE: Frontend calls AI Backend DIRECTLY for streaming search.
 * This bypasses the Database Backend proxy to avoid response buffering.
 * 
 * Flow:
 * 1. Get ai_project_id from Database Backend (via /api/projects/{id})
 * 2. Call AI Backend directly with ai_project_id for streaming
 * 
 * This gives us true real-time token streaming like ChatGPT/Perplexity.
 */
export function useStreamingSearch(): UseStreamingSearchReturn {
    const [state, setState] = useState<StreamingSearchState>(initialState)
    const abortControllerRef = useRef<AbortController | null>(null)
    // Cache ai_project_id to avoid repeated lookups
    const aiProjectIdCache = useRef<Map<string, string>>(new Map())
    // Collect sources during streaming to return them with the result
    const collectedSourcesRef = useRef<SourceItem[]>([])

    const reset = useCallback(() => {
        setState(initialState)
        collectedSourcesRef.current = []
    }, [])

    const abort = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
        setState(prev => ({ ...prev, isStreaming: false }))
    }, [])

    const streamSearch = useCallback(async (
        projectId: string,
        question: string,
        topK: number = 30
    ): Promise<StreamSearchResult> => {
        // Abort any existing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController()

        // Reset state and start streaming
        setState({
            ...initialState,
            isStreaming: true,
            thinkingStatus: 'Connecting...',
        })

        // Reset collected sources
        collectedSourcesRef.current = []

        let fullContent = ''

        try {
            // Step 1: Get ai_project_id (check cache first)
            let aiProjectId = aiProjectIdCache.current.get(projectId)

            if (!aiProjectId) {
                setState(prev => ({ ...prev, thinkingStatus: 'Loading project...' }))

                const projectRes = await fetch(`/api/projects/${projectId}`)
                if (!projectRes.ok) {
                    throw new Error('Failed to load project')
                }
                const projectData = await projectRes.json()
                aiProjectId = projectData.ai_project_id

                if (!aiProjectId) {
                    throw new Error('Project has not been indexed yet. Please index your emails first.')
                }

                // Cache for future requests
                aiProjectIdCache.current.set(projectId, aiProjectId)
            }

            console.log('🔍 [useStreamingSearch] Calling AI Backend directly:')
            console.log('   ai_project_id:', aiProjectId)
            console.log('   question:', question)
            console.log('   top_k:', topK)

            // Step 2: Call AI Backend DIRECTLY (bypasses Database Backend buffering)
            const response = await fetch(`${AI_BACKEND_URL}/api/search_project_stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    project_id: aiProjectId,
                    question,
                    top_k: topK,
                }),
                signal: abortControllerRef.current.signal,
            })

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status} ${response.statusText}`)
            }

            if (!response.body) {
                throw new Error('No response body available for streaming')
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { value, done } = await reader.read()

                if (done) break

                buffer += decoder.decode(value, { stream: true })

                // Parse SSE events from buffer
                const lines = buffer.split('\n')
                buffer = lines.pop() || '' // Keep incomplete line in buffer

                let currentEventType: StreamingEventType | null = null

                for (const line of lines) {
                    const trimmedLine = line.trim()

                    if (trimmedLine.startsWith('event: ')) {
                        currentEventType = trimmedLine.slice(7) as StreamingEventType
                    } else if (trimmedLine.startsWith('data: ') && currentEventType) {
                        try {
                            const data = JSON.parse(trimmedLine.slice(6))

                            switch (currentEventType) {
                                case 'thinking': {
                                    const thinkingData = data as ThinkingEventData
                                    setState(prev => ({
                                        ...prev,
                                        thinkingStatus: thinkingData.status,
                                    }))
                                    break
                                }

                                case 'sources': {
                                    const sourcesData = data as SourcesEventData
                                    const sources = sourcesData.sources || []
                                    console.log('📚 Sources received:', sources.length)
                                    // Store in ref for returning later (avoids closure issues)
                                    collectedSourcesRef.current = sources
                                    setState(prev => ({
                                        ...prev,
                                        sources,
                                        chunksRetrieved: sourcesData.chunks_retrieved,
                                        thinkingStatus: null, // Clear thinking when sources arrive
                                    }))
                                    break
                                }

                                case 'chunk': {
                                    const chunkData = data as ChunkEventData
                                    fullContent += chunkData.text
                                    setState(prev => ({
                                        ...prev,
                                        streamedContent: fullContent,
                                        thinkingStatus: null, // Clear thinking when content starts
                                    }))
                                    break
                                }

                                case 'done': {
                                    const doneData = data as DoneEventData
                                    setState(prev => ({
                                        ...prev,
                                        isStreaming: false,
                                        thinkingStatus: null,
                                        stats: {
                                            searchTimeMs: doneData.search_time_ms,
                                            llmTimeMs: doneData.llm_time_ms,
                                            totalTimeMs: doneData.total_time_ms,
                                        },
                                    }))
                                    break
                                }

                                case 'error': {
                                    const errorData = data as ErrorEventData
                                    setState(prev => ({
                                        ...prev,
                                        isStreaming: false,
                                        thinkingStatus: null,
                                        error: errorData.message,
                                    }))
                                    throw new Error(errorData.message)
                                }
                            }

                            currentEventType = null // Reset for next event
                        } catch (parseError) {
                            // Skip malformed JSON but don't break the stream
                            console.warn('Failed to parse SSE data:', parseError)
                        }
                    }
                }
            }

            // Finalize
            setState(prev => ({
                ...prev,
                isStreaming: false,
                thinkingStatus: null,
            }))

            // Return both content and sources
            return {
                content: fullContent,
                sources: collectedSourcesRef.current,
            }

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                // Request was aborted, don't treat as error
                return {
                    content: fullContent,
                    sources: collectedSourcesRef.current,
                }
            }

            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
            setState(prev => ({
                ...prev,
                isStreaming: false,
                thinkingStatus: null,
                error: errorMessage,
            }))

            throw error
        } finally {
            abortControllerRef.current = null
        }
    }, [])

    return {
        ...state,
        streamSearch,
        abort,
        reset,
    }
}
