"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ChatMessage } from '@/types/project'
import type { MessageResponse } from '@/types/api'

/**
 * Convert API message response to frontend ChatMessage type
 */
function toMessage(res: MessageResponse): ChatMessage {
  return {
    id: res.id,
    role: res.role,
    content: res.content,
    timestamp: new Date(res.timestamp),
    searchModes: res.search_modes as ChatMessage['searchModes'] || undefined,
    sources: res.sources || undefined,
  }
}

interface UseChatMessagesReturn {
  /** Messages for the current chat (from database) */
  messages: ChatMessage[]
  /** True while fetching messages */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Add a message to the local array (call after saving to DB) */
  addMessage: (message: ChatMessage) => void
  /** Refetch messages from server */
  refetch: () => Promise<void>
  /** Clear all messages (when changing chats) */
  clear: () => void
}

/**
 * Hook for fetching and managing messages for a specific chat.
 * 
 * IMPORTANT: This hook fetches messages ON DEMAND when chatId changes.
 * Messages are NOT cached globally - they live in this hook's local state.
 * 
 * This is intentional:
 * - Keeps messages separate from projects (lightweight API)
 * - No stale cache issues
 * - Fresh data on every chat view
 * 
 * RACE CONDITION FIX:
 * Uses request versioning (requestIdRef) to ignore stale fetch responses.
 * This prevents old responses from overwriting locally added messages when:
 * - chatId changes rapidly (new chat created)
 * - Multiple fetches are in flight
 * - React strict mode double-invokes effects
 * 
 * @param chatId - The chat ID to fetch messages for (null = no messages)
 */
export function useChatMessages(chatId: string | null): UseChatMessagesReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Request versioning to ignore stale fetch responses
  const requestIdRef = useRef(0)

  // Effect: fetch messages when chatId changes
  useEffect(() => {
    if (!chatId) {
      setMessages([])
      setError(null)
      return
    }
    
    // Increment request ID for this fetch
    const myRequestId = ++requestIdRef.current
    
    const fetchMessages = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/chats/${chatId}/messages`)
        
        // Check if this is still the latest request
        if (myRequestId !== requestIdRef.current) {
          console.log('[useChatMessages] Ignoring stale response for chatId:', chatId)
          return
        }
        
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Failed to fetch messages' }))
          throw new Error(data.error || `Failed to fetch messages: ${response.status}`)
        }
        
        const data: MessageResponse[] = await response.json()
        
        // Double-check we're still the latest request before updating state
        if (myRequestId !== requestIdRef.current) {
          console.log('[useChatMessages] Ignoring stale response (after parse) for chatId:', chatId)
          return
        }
        
        setMessages(data.map(toMessage))
      } catch (err) {
        // Only update error if this is still the latest request
        if (myRequestId !== requestIdRef.current) return
        
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch messages'
        setError(errorMessage)
        console.error('[useChatMessages] Fetch error:', errorMessage)
      } finally {
        // Only update loading if this is still the latest request
        if (myRequestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    }
    
    fetchMessages()
  }, [chatId])

  // Add a single message to the local array
  // Call this AFTER the message is saved to the database
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      // Avoid duplicates
      if (prev.some(m => m.id === message.id)) {
        return prev
      }
      return [...prev, message]
    })
  }, [])

  // Refetch messages from server
  const refetch = useCallback(async () => {
    if (!chatId) return
    
    // Increment request ID to invalidate any in-flight requests
    const myRequestId = ++requestIdRef.current
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`)
      
      if (myRequestId !== requestIdRef.current) return
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to fetch messages' }))
        throw new Error(data.error || `Failed to fetch messages: ${response.status}`)
      }
      
      const data: MessageResponse[] = await response.json()
      
      if (myRequestId !== requestIdRef.current) return
      
      setMessages(data.map(toMessage))
    } catch (err) {
      if (myRequestId !== requestIdRef.current) return
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch messages'
      setError(errorMessage)
    } finally {
      if (myRequestId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [chatId])

  // Clear messages (useful when unmounting or switching views)
  const clear = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    addMessage,
    refetch,
    clear,
  }
}
