"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { Project, ProjectFile, ProjectChat, ChatMessage, GeneralChat } from "@/types/project"
import { createClient } from "@/utils/supabase/client"
import { OfflineModal } from "@/components/OfflineModal"
import { useProjects as useSWRProjects, useProject as useSWRProject, invalidateProjects } from "@/hooks/useProjects"
import { useGeneralChats as useSWRGeneralChats, useChatMessages, invalidateChats } from "@/hooks/useChats"
import { postApi, putApi, deleteApi, toProjectChat, toMessage } from "@/lib/api"
import type { ChatResponse, MessageResponse } from "@/types/api"

// ============================================
// Context Interface (backward compatible)
// ============================================

interface ProjectContextType {
  // Data
  projects: Project[]
  currentProject: Project | null
  currentChatId: string | null
  generalChats: GeneralChat[]
  currentGeneralChatId: string | null
  isLoading: boolean
  error: string | null

  // Project management
  loadProjects: () => Promise<void>
  loadProject: (projectId: string) => Promise<Project | null>
  createProject: (name: string, description: string, companyAddress: string, tags: string[], files: File[]) => Promise<Project>
  updateProject: (id: string, updates: Partial<Pick<Project, 'name' | 'description' | 'companyAddress' | 'tags'>>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  setCurrentProject: (project: Project | null) => void

  // NEW: Refresh function for new architecture
  refreshProjects: () => Promise<void>

  // File management
  addFilesToProject: (projectId: string, files: File[], category: string) => Promise<void>
  removeFileFromProject: (projectId: string, fileId: string) => Promise<void>

  // Project Chat management
  createChat: (projectId: string, title?: string) => Promise<ProjectChat>
  setCurrentChatId: (chatId: string | null) => void
  updateChatTitle: (projectId: string, chatId: string, title: string) => Promise<void>
  deleteChat: (projectId: string, chatId: string) => Promise<void>

  // General Chat management
  loadGeneralChats: () => Promise<void>
  createGeneralChat: (title?: string) => Promise<GeneralChat>
  setCurrentGeneralChatId: (chatId: string | null) => void
  addMessageToGeneralChat: (chatId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<ChatMessage>
  updateGeneralChatTitle: (chatId: string, title: string) => Promise<void>
  deleteGeneralChat: (chatId: string) => Promise<void>
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

// ============================================
// Provider Props
// ============================================

interface ProjectProviderProps {
  children: ReactNode
  /** Initial projects from server-side prefetch */
  initialProjects?: Project[]
  /** Initial general chats from server-side prefetch */
  initialGeneralChats?: GeneralChat[]
}

// ============================================
// Provider Component - Now powered by SWR
// ============================================

export function ProjectProvider({
  children,
  initialProjects,
}: ProjectProviderProps) {
  // SWR hooks for data fetching (SINGLE SOURCE OF TRUTH)
  const {
    projects,
    isLoading: isProjectsLoading,
    error: projectsError,
    refresh: refreshProjects,
    createProject: swrCreateProject,
    updateProject: swrUpdateProject,
    deleteProject: swrDeleteProject,
    addFiles: swrAddFiles,
    removeFile: swrRemoveFile,
  } = useSWRProjects({ fallbackData: initialProjects })

  const {
    chats: generalChats,
    isLoading: isChatsLoading,
    refresh: refreshGeneralChats,
    createChat: swrCreateGeneralChat,
    deleteChat: swrDeleteGeneralChat,
    updateChatTitle: swrUpdateGeneralChatTitle,
  } = useSWRGeneralChats()

  // Local UI state only (not data!)
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [currentGeneralChatId, setCurrentGeneralChatId] = useState<string | null>(null)
  const [showOfflineModal, setShowOfflineModal] = useState(false)

  // Combined loading/error state
  const isLoading = isProjectsLoading || isChatsLoading
  const error = projectsError?.message || null

  // Sync currentProject with latest data from SWR (only if data changed)
  useEffect(() => {
    if (currentProject && projects.length > 0) {
      const updated = projects.find(p => p.id === currentProject.id)
      if (!updated) {
        // Project was deleted
        setCurrentProject(null)
        setCurrentChatId(null)
      }
      // Don't update if found - it causes unnecessary re-renders
      // The projects array from SWR is already the source of truth
    }
  }, [projects, currentProject?.id])

  // Auth state listener
  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setCurrentProject(null)
        setCurrentChatId(null)
        setCurrentGeneralChatId(null)
        invalidateProjects()
        invalidateChats()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Retry handler for offline modal
  const handleRetry = useCallback(() => {
    refreshProjects()
    refreshGeneralChats()
  }, [refreshProjects, refreshGeneralChats])

  // ============================================
  // Project Operations
  // ============================================

  const loadProjects = useCallback(async () => {
    await refreshProjects()
  }, [refreshProjects])

  const loadProject = useCallback(async (projectId: string): Promise<Project | null> => {
    // Use SWR's mutate to refresh and get the latest data
    await refreshProjects()
    // Return the project from the current projects array
    // Note: We access projects via closure, but don't add to deps to avoid recreating the function
    const found = projects.find(p => p.id === projectId)
    return found || null
  }, [refreshProjects]) // Intentionally not including 'projects' to keep function stable

  const createProject = useCallback(async (
    name: string,
    description: string,
    companyAddress: string,
    tags: string[],
    files: File[]
  ): Promise<Project> => {
    const newProject = await swrCreateProject({
      name,
      description,
      companyAddress,
      tags,
      files,
    })
    return newProject
  }, [swrCreateProject])

  const updateProject = useCallback(async (
    id: string,
    updates: Partial<Pick<Project, 'name' | 'description' | 'companyAddress' | 'tags'>>
  ) => {
    await swrUpdateProject(id, updates)
  }, [swrUpdateProject])

  const deleteProject = useCallback(async (id: string) => {
    if (currentProject?.id === id) {
      setCurrentProject(null)
      setCurrentChatId(null)
    }
    await swrDeleteProject(id)
  }, [swrDeleteProject, currentProject?.id])

  // ============================================
  // File Operations
  // ============================================

  const addFilesToProject = useCallback(async (projectId: string, files: File[], category: string) => {
    await swrAddFiles(projectId, files, category)
  }, [swrAddFiles])

  const removeFileFromProject = useCallback(async (projectId: string, fileId: string) => {
    await swrRemoveFile(projectId, fileId)
  }, [swrRemoveFile])

  // ============================================
  // Project Chat Operations
  // ============================================

  const createChat = useCallback(async (projectId: string, title?: string): Promise<ProjectChat> => {
    const response = await postApi<ChatResponse>(`/projects/${projectId}/chats`, { title })
    const newChat = toProjectChat(response)

    // Refresh to get updated data
    await refreshProjects()

    setCurrentChatId(newChat.id)
    return newChat
  }, [refreshProjects])

  // NOTE: Message operations (loadChatMessages, addMessageToChat) have been moved to
  // useChatMessages and useSendMessage hooks for the new architecture.
  // Messages are no longer embedded in projects - they're fetched on-demand.

  const updateChatTitle = useCallback(async (projectId: string, chatId: string, title: string) => {
    await putApi(`/chats/${chatId}`, { title })
    await refreshProjects()
  }, [refreshProjects])

  const deleteChat = useCallback(async (projectId: string, chatId: string) => {
    await deleteApi(`/chats/${chatId}`)
    if (currentChatId === chatId) setCurrentChatId(null)
    await refreshProjects()
  }, [currentChatId, refreshProjects])

  // ============================================
  // General Chat Operations
  // ============================================

  const loadGeneralChats = useCallback(async () => {
    await refreshGeneralChats()
  }, [refreshGeneralChats])

  const createGeneralChat = useCallback(async (title?: string): Promise<GeneralChat> => {
    const newChat = await swrCreateGeneralChat(title)
    setCurrentGeneralChatId(newChat.id)
    setCurrentProject(null)
    setCurrentChatId(null)
    return newChat
  }, [swrCreateGeneralChat])

  const addMessageToGeneralChat = useCallback(async (
    chatId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<ChatMessage> => {
    const response = await postApi<MessageResponse>(`/chats/${chatId}/messages`, {
      role: message.role,
      content: message.content,
      search_modes: message.searchModes,
    })
    const newMessage = toMessage(response)

    // Refresh to get updated data
    await refreshGeneralChats()

    return newMessage
  }, [refreshGeneralChats])

  const updateGeneralChatTitle = useCallback(async (chatId: string, title: string) => {
    await swrUpdateGeneralChatTitle(chatId, title)
  }, [swrUpdateGeneralChatTitle])

  const deleteGeneralChat = useCallback(async (chatId: string) => {
    await swrDeleteGeneralChat(chatId)
    if (currentGeneralChatId === chatId) setCurrentGeneralChatId(null)
  }, [swrDeleteGeneralChat, currentGeneralChatId])

  // ============================================
  // Render
  // ============================================

  return (
    <ProjectContext.Provider value={{
      projects,
      currentProject,
      currentChatId,
      generalChats,
      currentGeneralChatId,
      isLoading,
      error,
      loadProjects,
      loadProject,
      createProject,
      updateProject,
      deleteProject,
      setCurrentProject,
      refreshProjects,
      addFilesToProject,
      removeFileFromProject,
      createChat,
      setCurrentChatId,
      updateChatTitle,
      deleteChat,
      loadGeneralChats,
      createGeneralChat,
      setCurrentGeneralChatId,
      addMessageToGeneralChat,
      updateGeneralChatTitle,
      deleteGeneralChat,
    }}>
      {children}
      <OfflineModal
        isOpen={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
        onRetry={handleRetry}
        message="Unable to connect to the server. Please check your internet connection and try again."
      />
    </ProjectContext.Provider>
  )
}

export function useProjects() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider')
  }
  return context
}
