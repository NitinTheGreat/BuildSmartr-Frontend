/**
 * API utilities - Type converters and fetch helpers
 * Extracted from ProjectContext for reusability
 */

import type { Project, ProjectFile, ProjectChat, ChatMessage, GeneralChat } from "@/types/project"
import type {
  ProjectResponse,
  ChatResponse,
  MessageResponse,
  ProjectFileResponse
} from "@/types/api"

// ============================================
// Type Converters (API Response -> Frontend Types)
// ============================================

export function toProject(res: ProjectResponse): Project {
  return {
    id: res.id,
    name: res.name,
    description: res.description || "",
    companyAddress: res.company_address || "",
    tags: res.tags || [],
    files: (res.files || []).map(toProjectFile),
    chats: (res.chats || []).map(toProjectChat),
    createdAt: new Date(res.created_at),
    updatedAt: new Date(res.updated_at),
    // AI Integration fields
    aiProjectId: res.ai_project_id || null,
    indexingStatus: res.indexing_status || null,
    indexingError: res.indexing_error || null,
  }
}

export function toProjectFile(res: ProjectFileResponse): ProjectFile {
  return {
    id: res.id,
    name: res.name,
    size: res.size,
    type: res.type,
    category: res.category,
    url: res.url || undefined,
  }
}

export function toProjectChat(res: ChatResponse): ProjectChat {
  const messages = (res.messages || []).map(toMessage)
  return {
    id: res.id,
    title: res.title,
    messages,
    messageCount: res.message_count ?? messages.length,
    createdAt: new Date(res.created_at),
    updatedAt: new Date(res.updated_at),
  }
}

export function toGeneralChat(res: ChatResponse): GeneralChat {
  const messages = (res.messages || []).map(toMessage)
  return {
    id: res.id,
    title: res.title,
    messages,
    messageCount: res.message_count ?? messages.length,
    createdAt: new Date(res.created_at),
    updatedAt: new Date(res.updated_at),
  }
}

export function toMessage(res: MessageResponse): ChatMessage {
  return {
    id: res.id,
    role: res.role,
    content: res.content,
    timestamp: new Date(res.timestamp),
    searchModes: res.search_modes as ChatMessage['searchModes'] || undefined,
    sources: res.sources || undefined,
  }
}

// ============================================
// Client-side Fetch Helper
// ============================================

export interface FetchOptions extends Omit<RequestInit, 'cache'> {
  /** Skip throwing on non-2xx responses */
  skipThrow?: boolean
}

/**
 * Fetch from internal API routes (client-side)
 * Throws on network errors and non-2xx responses (unless skipThrow is true)
 */
export async function fetchApi<T>(endpoint: string, options?: FetchOptions): Promise<T> {
  try {
    const response = await fetch(`/api${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    })

    const data = await response.json().catch(() => ({ error: "Failed to parse response" }))

    if (!response.ok && !options?.skipThrow) {
      if (response.status === 503 || data.error === "Backend unavailable") {
        throw new Error("__CONNECTION_ERROR__")
      }
      throw new Error(data.error || response.statusText)
    }

    return data
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error("__CONNECTION_ERROR__")
    }
    throw err
  }
}

/**
 * Check if an error is a connection error
 */
export function isConnectionError(err: unknown): boolean {
  return err instanceof Error && err.message === "__CONNECTION_ERROR__"
}

// ============================================
// SWR Fetcher
// ============================================

/**
 * Default SWR fetcher for API routes
 */
export const swrFetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }))
    throw new Error(error.error || response.statusText)
  }

  return response.json()
}

// ============================================
// Mutation Helpers
// ============================================

/**
 * POST to an API endpoint
 */
export async function postApi<T>(endpoint: string, body: unknown): Promise<T> {
  return fetchApi<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

/**
 * PUT to an API endpoint
 */
export async function putApi<T>(endpoint: string, body: unknown): Promise<T> {
  return fetchApi<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

/**
 * DELETE to an API endpoint
 */
export async function deleteApi<T>(endpoint: string): Promise<T> {
  return fetchApi<T>(endpoint, {
    method: "DELETE",
  })
}
