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

const AI_BACKEND_URL = process.env.NEXT_PUBLIC_AI_BACKEND_URL || 'http://localhost:7071'
const AZURE_FUNCTION_KEY = process.env.NEXT_PUBLIC_AZURE_FUNCTION_KEY || ''

const initialState: StreamingSearchState = {
    isStreaming: false,
    thinkingStatus: null,
    sources: [],
    chunksRetrieved: 0,
    streamedContent: '',
    error: null,
    stats: null,
}

interface UseStreamingSearchReturn extends StreamingSearchState {
    streamSearch: (projectId: string, question: string, topK?: number) => Promise<string>
    abort: () => void
    reset: () => void
}

/**
 * Hook for handling SSE streaming search requests
 * Provides real-time updates for thinking status, sources, and streamed content
 */
export function useStreamingSearch(): UseStreamingSearchReturn {
    const [state, setState] = useState<StreamingSearchState>(initialState)
    const abortControllerRef = useRef<AbortController | null>(null)

    const reset = useCallback(() => {
        setState(initialState)
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
        topK: number = 50
    ): Promise<string> => {
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
            thinkingStatus: 'Starting search...',
        })

        let fullContent = ''

        try {
            console.log('🔍 [useStreamingSearch] Sending search request:')
            console.log('   project_id:', projectId)
            console.log('   question:', question)
            console.log('   top_k:', topK)
            console.log('   backend URL:', `${AI_BACKEND_URL}/api/search_project_stream`)

            const response = await fetch(`${AI_BACKEND_URL}/api/search_project_stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-functions-key': AZURE_FUNCTION_KEY,
                },
                body: JSON.stringify({
                    project_id: projectId,
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
                                    setState(prev => ({
                                        ...prev,
                                        sources: sourcesData.sources || [],
                                        chunksRetrieved: sourcesData.chunks_retrieved,
                                        thinkingStatus: `Generating answer from ${sourcesData.chunks_retrieved} sources...`,
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

            return fullContent

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                // Request was aborted, don't treat as error
                return fullContent
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
