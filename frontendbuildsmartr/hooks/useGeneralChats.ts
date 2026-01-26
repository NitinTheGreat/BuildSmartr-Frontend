"use client"

import useSWR from "swr"
import { useCallback } from "react"
import type { GeneralChat, ChatMessage } from "@/types/project"
import type { ChatResponse, MessageResponse } from "@/types/api"
import { swrFetcher, toGeneralChat, toMessage, postApi, putApi, deleteApi } from "@/lib/api"

const GENERAL_CHATS_KEY = "/api/chats"

interface UseGeneralChatsOptions {
  /** Initial chats data */
  fallbackData?: GeneralChat[]
}

interface UseGeneralChatsReturn {
  chats: GeneralChat[]
  isLoading: boolean
  error: Error | null
  /** Create a new general chat */
  createChat: (title?: string) => Promise<GeneralChat>
  /** Update chat title */
  updateChatTitle: (chatId: string, title: string) => Promise<void>
  /** Delete a chat */
  deleteChat: (chatId: string) => Promise<void>
  /** Add a message to a chat */
  addMessage: (chatId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<ChatMessage>
  /** Refresh chats */
  refresh: () => Promise<void>
}

/**
 * SWR hook for managing general (non-project) chats
 */
export function useGeneralChats(options: UseGeneralChatsOptions = {}): UseGeneralChatsReturn {
  const { data, error, isLoading, mutate } = useSWR<ChatResponse[]>(
    GENERAL_CHATS_KEY,
    swrFetcher,
    {
      fallbackData: options.fallbackData?.map(chatToResponse),
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  )

  const chats = (data || []).map(toGeneralChat)

  const createChat = useCallback(async (title?: string): Promise<GeneralChat> => {
    const response = await postApi<ChatResponse>("/chats", { title })
    const newChat = toGeneralChat(response)

    // Optimistically add
    await mutate(
      (current) => [response, ...(current || [])],
      { revalidate: false }
    )

    return newChat
  }, [mutate])

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

  const addMessage = useCallback(async (
    chatId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<ChatMessage> => {
    const response = await postApi<MessageResponse>(`/chats/${chatId}/messages`, {
      role: message.role,
      content: message.content,
      search_modes: message.searchModes,
    })

    const newMessage = toMessage(response)

    // Update the chat's message list optimistically
    await mutate(
      (current) => current?.map((c) => {
        if (c.id !== chatId) return c
        return {
          ...c,
          messages: [...(c.messages || []), response],
          message_count: (c.message_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        }
      }),
      { revalidate: false }
    )

    return newMessage
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
    addMessage,
    refresh,
  }
}

// Helper converter
function chatToResponse(chat: GeneralChat): ChatResponse {
  return {
    id: chat.id,
    user_id: "",
    project_id: null,
    title: chat.title,
    chat_type: "general",
    messages: chat.messages.map((m) => ({
      id: m.id,
      chat_id: chat.id,
      role: m.role,
      content: m.content,
      search_modes: m.searchModes || null,
      timestamp: m.timestamp.toISOString(),
    })),
    message_count: chat.messageCount,
    created_at: chat.createdAt.toISOString(),
    updated_at: chat.updatedAt.toISOString(),
  }
}
