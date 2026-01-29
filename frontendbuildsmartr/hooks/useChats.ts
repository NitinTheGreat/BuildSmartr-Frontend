"use client"

import useSWR, { mutate as globalMutate } from "swr"
import { useCallback } from "react"
import type { ProjectChat, ChatMessage, GeneralChat } from "@/types/project"
import type { ChatResponse, MessageResponse } from "@/types/api"
import { swrFetcher, toProjectChat, toGeneralChat, toMessage, postApi, putApi, deleteApi } from "@/lib/api"

// ============================================
// Project Chats Hook
// ============================================

interface UseProjectChatsReturn {
    chats: ProjectChat[]
    isLoading: boolean
    error: Error | null
    refresh: () => Promise<void>
    createChat: (title?: string) => Promise<ProjectChat>
    deleteChat: (chatId: string) => Promise<void>
    updateChatTitle: (chatId: string, title: string) => Promise<void>
}

/**
 * SWR hook for project chats
 */
export function useProjectChats(projectId: string | null): UseProjectChatsReturn {
    const key = projectId ? `/api/projects/${projectId}` : null

    // We fetch the full project and extract chats
    // This is because chats are nested in the project response
    const { data, error, isLoading, mutate } = useSWR<{ chats?: ChatResponse[] }>(
        key,
        swrFetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
        }
    )

    const chats = (data?.chats || []).map(toProjectChat)

    const refresh = useCallback(async () => {
        await mutate()
    }, [mutate])

    const createChat = useCallback(async (title?: string): Promise<ProjectChat> => {
        if (!projectId) throw new Error("No project ID")

        const response = await postApi<ChatResponse>(`/projects/${projectId}/chats`, { title })
        const newChat = toProjectChat(response)

        // Revalidate to get fresh data
        await mutate()

        return newChat
    }, [projectId, mutate])

    const deleteChat = useCallback(async (chatId: string): Promise<void> => {
        await deleteApi(`/chats/${chatId}`)
        await mutate()
    }, [mutate])

    const updateChatTitle = useCallback(async (chatId: string, title: string): Promise<void> => {
        await putApi(`/chats/${chatId}`, { title })
        await mutate()
    }, [mutate])

    return {
        chats,
        isLoading,
        error: error ?? null,
        refresh,
        createChat,
        deleteChat,
        updateChatTitle,
    }
}

// ============================================
// Chat Messages Hook
// ============================================

interface UseChatMessagesReturn {
    messages: ChatMessage[]
    isLoading: boolean
    error: Error | null
    refresh: () => Promise<void>
    addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<ChatMessage>
}

/**
 * SWR hook for chat messages
 * Single source of truth: DATABASE
 */
export function useChatMessages(chatId: string | null): UseChatMessagesReturn {
    const key = chatId ? `/api/chats/${chatId}/messages` : null

    const { data, error, isLoading, mutate } = useSWR<MessageResponse[]>(
        key,
        swrFetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
        }
    )

    const messages = (data || []).map(toMessage)

    const refresh = useCallback(async () => {
        await mutate()
    }, [mutate])

    const addMessage = useCallback(async (message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> => {
        if (!chatId) throw new Error("No chat ID")

        const response = await postApi<MessageResponse>(`/chats/${chatId}/messages`, {
            role: message.role,
            content: message.content,
            search_modes: message.searchModes,
        })

        const newMessage = toMessage(response)

        // Revalidate to get fresh data
        await mutate()

        return newMessage
    }, [chatId, mutate])

    return {
        messages,
        isLoading,
        error: error ?? null,
        refresh,
        addMessage,
    }
}

// ============================================
// General Chats Hook
// ============================================

interface UseGeneralChatsReturn {
    chats: GeneralChat[]
    isLoading: boolean
    error: Error | null
    refresh: () => Promise<void>
    createChat: (title?: string) => Promise<GeneralChat>
    deleteChat: (chatId: string) => Promise<void>
    updateChatTitle: (chatId: string, title: string) => Promise<void>
}

/**
 * SWR hook for general (non-project) chats
 */
export function useGeneralChats(): UseGeneralChatsReturn {
    const { data, error, isLoading, mutate } = useSWR<ChatResponse[]>(
        "/api/chats",
        swrFetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
        }
    )

    const chats = (data || []).map(toGeneralChat)

    const refresh = useCallback(async () => {
        await mutate()
    }, [mutate])

    const createChat = useCallback(async (title?: string): Promise<GeneralChat> => {
        const response = await postApi<ChatResponse>("/chats", { title })
        const newChat = toGeneralChat(response)

        // Revalidate to get fresh data
        await mutate()

        return newChat
    }, [mutate])

    const deleteChat = useCallback(async (chatId: string): Promise<void> => {
        await deleteApi(`/chats/${chatId}`)
        await mutate()
    }, [mutate])

    const updateChatTitle = useCallback(async (chatId: string, title: string): Promise<void> => {
        await putApi(`/chats/${chatId}`, { title })
        await mutate()
    }, [mutate])

    return {
        chats,
        isLoading,
        error: error ?? null,
        refresh,
        createChat,
        deleteChat,
        updateChatTitle,
    }
}

// ============================================
// Cache Invalidation Helpers
// ============================================

/**
 * Invalidate all chat-related caches
 */
export function invalidateChats() {
    globalMutate((key) => typeof key === "string" && key.includes("/chats"))
}

/**
 * Invalidate a specific chat's messages
 */
export function invalidateChatMessages(chatId: string) {
    globalMutate(`/api/chats/${chatId}/messages`)
}
