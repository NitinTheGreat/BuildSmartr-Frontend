"use client"

import { useState, useCallback, useRef } from 'react'
import type {
    StreamingEventType,
    StreamingSearchState,
    ThinkingEventData,
    RewriteEventData,
    SourcesEventData,
    ChunkEventData,
    DoneEventData,
    ErrorEventData,
    SourceItem,
    ChatContext,
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
    rewriteInfo: null,
    stats: null,
}

// Return type for streamSearch - includes content, sources, and rewrite info
export interface StreamSearchResult {
    content: string
    sources: SourceItem[]
    rewriteInfo: {
        original: string
        standalone: string
        wasRewritten: boolean
    } | null
}

interface UseStreamingSearchReturn extends StreamingSearchState {
    streamSearch: (chatId: string, question: string, topK?: number) => Promise<StreamSearchResult>
    abort: () => void
    reset: () => void
}

/**
 * Hook for handling SSE streaming search requests with conversation memory.
 * 
 * ARCHITECTURE: 
 * 1. Frontend calls Database Backend to get chat context (summary + recent messages)
 * 2. Frontend calls AI Backend DIRECTLY with context for streaming
 * 
 * This enables Claude-like follow-up question handling:
 * - "What about the second one?" gets resolved to "What is the amount of Invoice INV-1043?"
 * - The AI has context of the conversation to give consistent answers
 */
export function useStreamingSearch(): UseStreamingSearchReturn {
    const [state, setState] = useState<StreamingSearchState>(initialState)
    const abortControllerRef = useRef<AbortController | null>(null)
    // Cache contexts to avoid repeated lookups within the same session
    const contextCache = useRef<Map<string, ChatContext>>(new Map())
    // Collect sources and rewrite info during streaming
    const collectedSourcesRef = useRef<SourceItem[]>([])
    const rewriteInfoRef = useRef<StreamSearchResult['rewriteInfo']>(null)

    const reset = useCallback(() => {
        setState(initialState)
        collectedSourcesRef.current = []
        rewriteInfoRef.current = null
    }, [])

    const abort = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
        setState(prev => ({ ...prev, isStreaming: false }))
    }, [])

    /**
     * Fetch chat context from Database Backend.
     * This includes summary, recent messages, and project info.
     */
    const fetchChatContext = async (chatId: string): Promise<ChatContext | null> => {
        // Check cache first
        const cached = contextCache.current.get(chatId)
        if (cached) {
            return cached
        }

        try {
            const response = await fetch(`/api/chats/${chatId}/context`)
            if (!response.ok) {
                console.warn('Failed to fetch chat context:', response.statusText)
                return null
            }
            const context: ChatContext = await response.json()

            // Cache for future requests in this session
            // Note: We don't cache indefinitely since context changes with each message
            contextCache.current.set(chatId, context)

            return context
        } catch (error) {
            console.warn('Error fetching chat context:', error)
            return null
        }
    }

    /**
     * Invalidate cached context for a chat (call after sending a message)
     */
    const invalidateContext = useCallback((chatId: string) => {
        contextCache.current.delete(chatId)
    }, [])

    const streamSearch = useCallback(async (
        chatId: string,
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
            thinkingStatus: 'Loading conversation context...',
        })

        // Reset collected data
        collectedSourcesRef.current = []
        rewriteInfoRef.current = null

        let fullContent = ''

        try {
            // Step 1: Get chat context (summary + recent messages + project info)
            setState(prev => ({ ...prev, thinkingStatus: 'Loading conversation context...' }))
            const context = await fetchChatContext(chatId)

            if (!context) {
                throw new Error('Failed to load chat context')
            }

            if (!context.ai_project_id) {
                throw new Error('Project has not been indexed yet. Please index your emails first.')
            }

            // Invalidate cache since we're about to add a new message
            invalidateContext(chatId)

            console.log('🔍 [useStreamingSearch] Calling AI Backend with conversation context:')
            console.log('   ai_project_id:', context.ai_project_id)
            console.log('   question:', question)
            console.log('   has_summary:', !!context.summary)
            console.log('   recent_messages:', context.recent_messages?.length || 0)

            // Step 2: Call AI Backend DIRECTLY with conversation context
            const response = await fetch(`${AI_BACKEND_URL}/api/search_project_stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    project_id: context.ai_project_id,
                    question,
                    top_k: topK,
                    // NEW: Pass conversation context for follow-up handling
                    summary: context.summary,
                    recent_messages: context.recent_messages,
                    project_name: context.project_name,
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

                                // NEW: Handle rewrite event
                                case 'rewrite': {
                                    const rewriteData = data as RewriteEventData
                                    const info = {
                                        original: rewriteData.original,
                                        standalone: rewriteData.standalone,
                                        wasRewritten: rewriteData.was_rewritten,
                                    }
                                    rewriteInfoRef.current = info
                                    setState(prev => ({
                                        ...prev,
                                        rewriteInfo: info,
                                    }))
                                    if (rewriteData.was_rewritten) {
                                        console.log('🔄 Question rewritten:', rewriteData.original, '→', rewriteData.standalone)
                                    }
                                    break
                                }

                                case 'sources': {
                                    const sourcesData = data as SourcesEventData
                                    const sources = sourcesData.sources || []
                                    console.log('📚 Sources received:', sources.length)
                                    collectedSourcesRef.current = sources
                                    setState(prev => ({
                                        ...prev,
                                        sources,
                                        chunksRetrieved: sourcesData.chunks_retrieved,
                                        thinkingStatus: null,
                                    }))
                                    break
                                }

                                case 'chunk': {
                                    const chunkData = data as ChunkEventData
                                    fullContent += chunkData.text
                                    setState(prev => ({
                                        ...prev,
                                        streamedContent: fullContent,
                                        thinkingStatus: null,
                                    }))
                                    break
                                }

                                case 'done': {
                                    const doneData = data as DoneEventData
                                    // Capture rewrite info from done event if not already set
                                    if (doneData.rewrite && !rewriteInfoRef.current) {
                                        rewriteInfoRef.current = {
                                            original: doneData.rewrite.original,
                                            standalone: doneData.rewrite.standalone,
                                            wasRewritten: doneData.rewrite.was_rewritten,
                                        }
                                    }
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

            return {
                content: fullContent,
                sources: collectedSourcesRef.current,
                rewriteInfo: rewriteInfoRef.current,
            }

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return {
                    content: fullContent,
                    sources: collectedSourcesRef.current,
                    rewriteInfo: rewriteInfoRef.current,
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
    }, [invalidateContext])

    return {
        ...state,
        streamSearch,
        abort,
        reset,
    }
}
