/**
 * SSE Streaming Types for Search Endpoint
 * These types correspond to events from /api/search_project_stream
 */

export type StreamingEventType = 'thinking' | 'rewrite' | 'sources' | 'chunk' | 'done' | 'error'

// Individual event data types
export interface ThinkingEventData {
    status: string
}

// NEW: Rewrite event data for follow-up question resolution
export interface RewriteEventData {
    original: string
    standalone: string
    was_rewritten: boolean
}

export interface SourceItem {
    chunk_id: string
    chunk_type: string
    text: string
    score: number
    sender: string
    timestamp: string
    subject: string
    file_id?: string
    page?: string | number
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
    // NEW: Include rewrite info in done event
    rewrite?: {
        original: string
        standalone: string
        was_rewritten: boolean
    }
}

export interface ErrorEventData {
    message: string
}

// Union type for all event data
export type StreamingEventData =
    | ThinkingEventData
    | RewriteEventData
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
    // NEW: Track rewrite info for debugging/display
    rewriteInfo: {
        original: string
        standalone: string
        wasRewritten: boolean
    } | null
    stats: {
        searchTimeMs: number
        llmTimeMs: number
        totalTimeMs: number
    } | null
}

// NEW: Chat context from backend
export interface ChatContext {
    chat_id: string
    project_id: string | null
    ai_project_id: string | null
    project_name: string | null
    summary: string | null
    recent_messages: Array<{ role: string; content: string }>
    message_count: number
    should_resummarize: boolean
}
