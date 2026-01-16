/**
 * SSE Streaming Types for Search Endpoint
 * These types correspond to events from /api/search_project_stream
 */

export type StreamingEventType = 'thinking' | 'sources' | 'chunk' | 'done' | 'error'

// Individual event data types
export interface ThinkingEventData {
    status: string
}

export interface SourceItem {
    id?: string
    title?: string
    content?: string
    score?: number
    metadata?: Record<string, unknown>
}

export interface SourcesEventData {
    sources: SourceItem[]
    chunks_retrieved: number
    search_time_ms: number
}

export interface ChunkEventData {
    text: string
}

export interface DoneEventData {
    search_time_ms: number
    llm_time_ms: number
    total_time_ms: number
    chunks_retrieved?: number
}

export interface ErrorEventData {
    message: string
}

// Union type for all event data
export type StreamingEventData =
    | ThinkingEventData
    | SourcesEventData
    | ChunkEventData
    | DoneEventData
    | ErrorEventData

// Parsed SSE event
export interface StreamingEvent {
    type: StreamingEventType
    data: StreamingEventData
}

// Hook state
export interface StreamingSearchState {
    isStreaming: boolean
    thinkingStatus: string | null
    sources: SourceItem[]
    chunksRetrieved: number
    streamedContent: string
    error: string | null
    stats: {
        searchTimeMs: number
        llmTimeMs: number
        totalTimeMs: number
    } | null
}
