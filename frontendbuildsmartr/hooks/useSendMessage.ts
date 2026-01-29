"use client"

import { useState, useCallback, useRef } from 'react'
import type { ChatMessage, MessageSource } from '@/types/project'
import type { SourceItem } from '@/types/streaming'
import type { MessageResponse, ChatResponse } from '@/types/api'
import { useStreamingSearch, type StreamSearchResult } from './useStreamingSearch'

/**
 * Convert SourceItem (from streaming) to MessageSource (for storage)
 */
function sourceItemToMessageSource(source: SourceItem): MessageSource {
  return {
    chunk_id: source.chunk_id,
    chunk_type: source.chunk_type,
    text: source.text,
    score: source.score,
    sender: source.sender,
    timestamp: source.timestamp,
    subject: source.subject,
  }
}

/**
 * Convert API message response to ChatMessage
 */
function toMessage(res: MessageResponse): ChatMessage {
  return {
    id: res.id,
    role: res.role,
    content: res.content,
    timestamp: new Date(res.timestamp),
    searchModes: res.search_modes as ChatMessage['searchModes'] || undefined,
    sources: res.sources?.map(s => ({
      chunk_id: s.chunk_id,
      chunk_type: s.chunk_type,
      text: s.text,
      score: s.score,
      sender: s.sender,
      timestamp: s.timestamp,
      subject: s.subject,
    })) || undefined,
  }
}

interface UseSendMessageOptions {
  /** Current project ID */
  projectId: string
  /** Current chat ID (null if new chat) */
  chatId: string | null
  /** Callback to set the chat ID after creating a new chat */
  onChatCreated: (chatId: string) => void
  /** Callback to add a message to the messages array */
  addMessage: (message: ChatMessage) => void
  /** Callback to refresh projects (updates sidebar) */
  refreshProjects: () => Promise<void>
}

interface UseSendMessageReturn {
  /** Send a message */
  send: (content: string) => Promise<void>
  /** True while saving user message or streaming */
  isSending: boolean
  /** Content of the pending user message (for "sending..." UI) */
  pendingUserContent: string | null
  /** True to show "Searching..." placeholder immediately */
  showAssistantPlaceholder: boolean
  /** True while AI is actively streaming */
  isStreaming: boolean
  /** Current streamed content from AI */
  streamedContent: string
  /** Sources from the AI response */
  streamedSources: SourceItem[]
  /** Thinking status message */
  thinkingStatus: string | null
  /** Error message */
  error: string | null
  /** True if AI response failed to save (show copy button) */
  saveError: boolean
  /** Copy the streamed content to clipboard */
  copyStreamedContent: () => void
  /** Clear error state */
  clearError: () => void
  /** Abort the current streaming request */
  abort: () => void
}

/**
 * Hook for sending messages with the durable-first flow.
 * 
 * FLOW:
 * 1. Show pending UI instantly (0ms)
 * 2. Save user message to DB (await)
 * 3. Stream AI response
 * 4. Save AI response to DB (await)
 * 
 * This ensures:
 * - Instant feel (placeholders appear immediately)
 * - Durability (nothing is lost, all saved to DB)
 * - AI only runs after user message is confirmed saved
 */
export function useSendMessage(options: UseSendMessageOptions): UseSendMessageReturn {
  const { projectId, chatId, onChatCreated, addMessage, refreshProjects } = options

  // UI States
  const [isSending, setIsSending] = useState(false)
  const [pendingUserContent, setPendingUserContent] = useState<string | null>(null)
  const [showAssistantPlaceholder, setShowAssistantPlaceholder] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState(false)

  // Track the content that failed to save (for copy functionality)
  const failedContentRef = useRef<string | null>(null)

  // Use the streaming search hook
  const {
    isStreaming,
    thinkingStatus,
    sources: streamedSources,
    streamedContent,
    streamSearch,
    reset: resetStreaming,
    abort: abortStreaming,
  } = useStreamingSearch()

  // Copy streamed content to clipboard (for save failure case)
  const copyStreamedContent = useCallback(() => {
    const content = failedContentRef.current || streamedContent
    if (content) {
      navigator.clipboard.writeText(content).catch(console.error)
    }
  }, [streamedContent])

  // Clear error state
  const clearError = useCallback(() => {
    setError(null)
    setSaveError(false)
    failedContentRef.current = null
  }, [])

  // Main send function
  const send = useCallback(async (content: string) => {
    if (!content.trim()) return

    console.log('[useSendMessage] Starting send:', content.slice(0, 50))

    // STEP 1: Show pending UI instantly (0ms)
    setIsSending(true)
    setPendingUserContent(content)
    setShowAssistantPlaceholder(true)
    setError(null)
    setSaveError(false)
    failedContentRef.current = null
    resetStreaming()

    let currentChatId = chatId
    let isNewChat = false

    try {
      // STEP 2: Create chat if needed (must await - need chat ID)
      if (!currentChatId) {
        console.log('[useSendMessage] Creating new chat...')
        isNewChat = true
        
        const response = await fetch(`/api/projects/${projectId}/chats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: content.slice(0, 50) }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Failed to create chat' }))
          throw new Error(data.error || 'Failed to create chat')
        }

        const chatData: ChatResponse = await response.json()
        currentChatId = chatData.id
        console.log('[useSendMessage] Chat created:', currentChatId)
        
        // NOTE: Don't call onChatCreated yet! Wait until messages are saved.
        // This prevents ChatView from fetching empty messages.
      }

      // STEP 3: Save user message to DB (AWAIT - critical!)
      console.log('[useSendMessage] Saving user message...')
      
      const userMsgResponse = await fetch(`/api/chats/${currentChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'user',
          content,
        }),
      })

      if (!userMsgResponse.ok) {
        const data = await userMsgResponse.json().catch(() => ({ error: 'Failed to save message' }))
        throw new Error(data.error || 'Failed to save message')
      }

      const savedUserMessage: MessageResponse = await userMsgResponse.json()
      console.log('[useSendMessage] User message saved:', savedUserMessage.id)

      // Add saved message to UI and clear pending
      addMessage(toMessage(savedUserMessage))
      setPendingUserContent(null)

      // STEP 4: Stream AI response
      console.log('[useSendMessage] Starting AI streaming...')
      let streamResult: StreamSearchResult

      try {
        streamResult = await streamSearch(projectId, content)
        console.log('[useSendMessage] Streaming complete:', {
          contentLength: streamResult.content?.length || 0,
          sourcesCount: streamResult.sources?.length || 0,
        })
      } catch (streamError) {
        // Streaming failed
        const errorMsg = streamError instanceof Error ? streamError.message : 'AI search failed'
        console.error('[useSendMessage] Streaming error:', errorMsg)
        
        // Save error message to DB
        const errorMessage: ChatMessage = {
          id: `error_${Date.now()}`,
          role: 'assistant',
          content: `Sorry, I encountered an error: ${errorMsg}. Please try again.`,
          timestamp: new Date(),
        }
        
        try {
          const errorMsgResponse = await fetch(`/api/chats/${currentChatId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: 'assistant',
              content: errorMessage.content,
            }),
          })
          
          if (errorMsgResponse.ok) {
            const savedError = await errorMsgResponse.json()
            addMessage(toMessage(savedError))
          }
        } catch {
          // Couldn't save error message, just show it
          addMessage(errorMessage)
        }
        
        setShowAssistantPlaceholder(false)
        setError(errorMsg)
        
        // Switch to ChatView so user can see the error
        if (isNewChat && currentChatId) {
          onChatCreated(currentChatId)
        }
        return
      }

      // STEP 5: Save AI response to DB (AWAIT - critical!)
      if (streamResult.content && streamResult.content.trim()) {
        console.log('[useSendMessage] Saving AI message...')
        
        const sources = streamResult.sources.map(sourceItemToMessageSource)
        
        try {
          const aiMsgResponse = await fetch(`/api/chats/${currentChatId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: 'assistant',
              content: streamResult.content,
              sources: sources.length > 0 ? sources : undefined,
            }),
          })

          if (!aiMsgResponse.ok) {
            // AI message save failed - show warning with copy button
            console.error('[useSendMessage] Failed to save AI message')
            failedContentRef.current = streamResult.content
            setSaveError(true)
            setError("Response couldn't be saved. Copy it before refreshing!")
            
            // Clear streaming FIRST to prevent double-render
            setShowAssistantPlaceholder(false)
            resetStreaming()
            
            // Then add to local UI so user can see it
            addMessage({
              id: `unsaved_${Date.now()}`,
              role: 'assistant',
              content: streamResult.content,
              timestamp: new Date(),
              sources: sources.length > 0 ? sources : undefined,
            })
            
            // Still switch to ChatView so user can see the content
            if (isNewChat && currentChatId) {
              onChatCreated(currentChatId)
            }
          } else {
            const savedAiMessage: MessageResponse = await aiMsgResponse.json()
            console.log('[useSendMessage] AI message saved:', savedAiMessage.id)
            
            // Clear streaming FIRST to prevent double-render
            setShowAssistantPlaceholder(false)
            resetStreaming()
            
            // Then add the saved message
            addMessage(toMessage(savedAiMessage))
            
            // NOW we can notify parent of new chat (after all messages are saved)
            if (isNewChat && currentChatId) {
              console.log('[useSendMessage] Notifying parent of new chat:', currentChatId)
              onChatCreated(currentChatId)
            }
          }
        } catch (saveErr) {
          // Save threw an exception
          console.error('[useSendMessage] Exception saving AI message:', saveErr)
          failedContentRef.current = streamResult.content
          setSaveError(true)
          setError("Response couldn't be saved. Copy it before refreshing!")
          
          // Clear streaming FIRST to prevent double-render
          setShowAssistantPlaceholder(false)
          resetStreaming()
          
          // Then add to local UI
          addMessage({
            id: `unsaved_${Date.now()}`,
            role: 'assistant',
            content: streamResult.content,
            timestamp: new Date(),
            sources: sources.length > 0 ? sources : undefined,
          })
          
          // Still switch to ChatView so user can see the content
          if (isNewChat && currentChatId) {
            onChatCreated(currentChatId)
          }
        }
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Something went wrong'
      console.error('[useSendMessage] Error:', errorMsg)
      setError(errorMsg)
    } finally {
      // STEP 6: Cleanup - only reset sending state
      // Note: streaming cleanup happens BEFORE addMessage to prevent double-render
      console.log('[useSendMessage] Cleanup')
      setIsSending(false)
      setPendingUserContent(null)
      
      // Refresh projects to update sidebar
      refreshProjects().catch(console.error)
    }
  }, [
    chatId,
    projectId,
    onChatCreated,
    addMessage,
    refreshProjects,
    streamSearch,
    resetStreaming,
  ])

  return {
    send,
    isSending,
    pendingUserContent,
    showAssistantPlaceholder,
    isStreaming,
    streamedContent,
    streamedSources,
    thinkingStatus,
    error,
    saveError,
    copyStreamedContent,
    clearError,
    abort: abortStreaming,
  }
}
