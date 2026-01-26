"use client"

import useSWR, { mutate as globalMutate } from "swr"
import { useCallback } from "react"
import type { ProjectChat, ChatMessage } from "@/types/project"
import type { ChatResponse, MessageResponse } from "@/types/api"
import { swrFetcher, toProjectChat, toMessage, postApi, putApi, deleteApi } from "@/lib/api"

interface UseProjectChatsOptions {
  /** Initial chats data */
  fallbackData?: ProjectChat[]
}

interface UseProjectChatsReturn {
  chats: ProjectChat[]
  isLoading: boolean
  error: Error | null
  /** Create a new chat for this project */
  createChat: (title?: string) => Promise<ProjectChat>
  /** Update chat title */
  updateChatTitle: (chatId: string, title: string) => Promise<void>
  /** Delete a chat */
  deleteChat: (chatId: string) => Promise<void>
  /** Refresh chats */
  refresh: () => Promise<void>
}

/**
 * SWR hook for managing project chats
 */
export function useProjectChats(
  projectId: string | null,
  options: UseProjectChatsOptions = {}
): UseProjectChatsReturn {
  const key = projectId ? `/api/projects/${projectId}/chats` : null

  const { data, error, isLoading, mutate } = useSWR<ChatResponse[]>(
    key,
    swrFetcher,
    {
      fallbackData: options.fallbackData?.map(chatToResponse),
      revalidateOnFocus: false,
    }
  )

  const chats = (data || []).map(toProjectChat)

  const createChat = useCallback(async (title?: string): Promise<ProjectChat> => {
    if (!projectId) throw new Error("No project ID")

    const response = await postApi<ChatResponse>(`/projects/${projectId}/chats`, { title })
    const newChat = toProjectChat(response)

    // Optimistically add
    await mutate(
      (current) => [response, ...(current || [])],
      { revalidate: false }
    )

    return newChat
  }, [projectId, mutate])

  const updateChatTitle = useCallback(async (chatId: string, title: string): Promise<void> => {
    // Optimistically update
    await mutate(
      (current) => current?.map((c) =>
        c.id === chatId ? { ...c, title, updated_at: new Date().toISOString() } : c
      ),
      { revalidate: false }
    )

    await putApi(`/chats/${chatId}`, { title })
  }, [mutate])

  const deleteChat = useCallback(async (chatId: string): Promise<void> => {
    // Optimistically remove
    await mutate(
      (current) => current?.filter((c) => c.id !== chatId),
      { revalidate: false }
    )

    await deleteApi(`/chats/${chatId}`)
  }, [mutate])

  const refresh = useCallback(async () => {
    await mutate()
  }, [mutate])

  return {
    chats,
    isLoading,
    error: error ?? null,
    createChat,
    updateChatTitle,
    deleteChat,
    refresh,
  }
}

// ============================================
// Chat Messages Hook
// ============================================

interface UseChatMessagesOptions {
  /** Initial messages data */
  fallbackData?: ChatMessage[]
}

interface UseChatMessagesReturn {
  messages: ChatMessage[]
  isLoading: boolean
  error: Error | null
  /** Add a message to this chat */
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<ChatMessage>
  /** Refresh messages */
  refresh: () => Promise<void>
}

/**
 * SWR hook for managing chat messages
 */
export function useChatMessages(
  chatId: string | null,
  options: UseChatMessagesOptions = {}
): UseChatMessagesReturn {
  const key = chatId ? `/api/chats/${chatId}/messages` : null

  const { data, error, isLoading, mutate } = useSWR<MessageResponse[]>(
    key,
    swrFetcher,
    {
      fallbackData: options.fallbackData?.map(messageToResponse),
      revalidateOnFocus: false,
    }
  )

  const messages = (data || []).map(toMessage)

  const addMessage = useCallback(async (
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<ChatMessage> => {
    if (!chatId) throw new Error("No chat ID")

    const response = await postApi<MessageResponse>(`/chats/${chatId}/messages`, {
      role: message.role,
      content: message.content,
      search_modes: message.searchModes,
    })

    const newMessage = toMessage(response)

    // Optimistically add
    await mutate(
      (current) => [...(current || []), response],
      { revalidate: false }
    )

    return newMessage
  }, [chatId, mutate])

  const refresh = useCallback(async () => {
    await mutate()
  }, [mutate])

  return {
    messages,
    isLoading,
    error: error ?? null,
    addMessage,
    refresh,
  }
}

/**
 * Invalidate all chat-related caches
 */
export function invalidateChats() {
  globalMutate((key) => typeof key === "string" && key.includes("/chats"))
}

// Helper converters
function chatToResponse(chat: ProjectChat): ChatResponse {
  return {
    id: chat.id,
    user_id: "",
    project_id: null,
    title: chat.title,
    chat_type: "project",
    messages: chat.messages.map(messageToResponse),
    message_count: chat.messageCount,
    created_at: chat.createdAt.toISOString(),
    updated_at: chat.updatedAt.toISOString(),
  }
}

function messageToResponse(msg: ChatMessage): MessageResponse {
  return {
    id: msg.id,
    chat_id: "",
    role: msg.role,
    content: msg.content,
    search_modes: msg.searchModes || null,
    timestamp: msg.timestamp.toISOString(),
  }
}
