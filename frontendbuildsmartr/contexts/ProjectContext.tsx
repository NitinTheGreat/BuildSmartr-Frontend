"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { Project, ProjectFile, ProjectChat, ChatMessage, GeneralChat } from "@/types/project"
import type { ProjectResponse, ChatResponse, MessageResponse } from "@/types/api"
import { createClient } from "@/utils/supabase/client"
import { OfflineModal } from "@/components/OfflineModal"
import {
  fetchApi,
  postApi,
  putApi,
  deleteApi,
  toProject,
  toProjectFile,
  toProjectChat,
  toGeneralChat,
  toMessage,
  isConnectionError
} from "@/lib/api"

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

  // File management
  addFilesToProject: (projectId: string, files: File[], category: string) => Promise<void>
  removeFileFromProject: (projectId: string, fileId: string) => Promise<void>

  // Project Chat management
  createChat: (projectId: string, title?: string) => Promise<ProjectChat>
  setCurrentChatId: (chatId: string | null) => void
  loadChatMessages: (projectId: string, chatId: string) => Promise<void>
  addMessageToChat: (projectId: string, chatId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<ChatMessage>
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
// Provider Component
// ============================================

export function ProjectProvider({
  children,
  initialProjects,
  initialGeneralChats
}: ProjectProviderProps) {
  // Core state
  const [projects, setProjects] = useState<Project[]>(initialProjects || [])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [generalChats, setGeneralChats] = useState<GeneralChat[]>(initialGeneralChats || [])
  const [currentGeneralChatId, setCurrentGeneralChatId] = useState<string | null>(null)

  // Loading/error state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(!!initialProjects)
  const [showOfflineModal, setShowOfflineModal] = useState(false)

  // Error handler
  const handleError = useCallback((err: unknown, fallbackMessage: string) => {
    if (isConnectionError(err)) {
      setShowOfflineModal(true)
      return
    }
    console.error(fallbackMessage, err)
    setError(err instanceof Error ? err.message : fallbackMessage)
  }, [])

  // Retry handler for offline modal
  const handleRetry = useCallback(() => {
    loadProjects()
    loadGeneralChats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auth state listener - load data on sign in
  useEffect(() => {
    // Skip if we have initial data from server
    if (initialProjects) return

    const supabase = createClient()
    let isMounted = true

    const loadAllData = async () => {
      if (hasLoadedInitialData) return

      const { data: { session } } = await supabase.auth.getSession()
      if (session && isMounted) {
        setHasLoadedInitialData(true)
        setIsLoading(true)
        try {
          await Promise.all([loadProjects(), loadGeneralChats()])
        } catch (err) {
          console.error("Error loading initial data:", err)
        } finally {
          if (isMounted) setIsLoading(false)
        }
      }
    }

    loadAllData()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return

      if (session && event === 'SIGNED_IN' && !hasLoadedInitialData) {
        setHasLoadedInitialData(true)
        setIsLoading(true)
        try {
          await Promise.all([loadProjects(), loadGeneralChats()])
        } catch (err) {
          console.error("Error loading data after sign in:", err)
        } finally {
          if (isMounted) setIsLoading(false)
        }
      } else if (event === 'SIGNED_OUT') {
        setProjects([])
        setGeneralChats([])
        setCurrentProject(null)
        setCurrentChatId(null)
        setCurrentGeneralChatId(null)
        setHasLoadedInitialData(false)
        setIsLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProjects])

  // ============================================
  // Project Operations
  // ============================================

  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchApi<ProjectResponse[]>("/projects")
      setProjects(data.map(toProject))
    } catch (err) {
      handleError(err, "Failed to load projects")
    } finally {
      setIsLoading(false)
    }
  }, [handleError])

  const loadProject = useCallback(async (projectId: string): Promise<Project | null> => {
    try {
      setError(null)
      const data = await fetchApi<ProjectResponse>(`/projects/${projectId}`)
      const project = toProject(data)
      setProjects(prev => prev.map(p => p.id === projectId ? project : p))
      return project
    } catch (err) {
      handleError(err, "Failed to load project")
      return null
    }
  }, [handleError])

  const createProject = useCallback(async (
    name: string,
    description: string,
    companyAddress: string,
    tags: string[],
    files: File[]
  ): Promise<Project> => {
    setError(null)
    const data = await postApi<ProjectResponse>("/projects", {
      name,
      description,
      company_address: companyAddress,
      tags,
    })
    const newProject = toProject(data)

    // Upload files if any
    if (files.length > 0) {
      const uploadedFiles: ProjectFile[] = []
      for (const file of files) {
        try {
          const formData = new FormData()
          formData.append("file", file)
          formData.append("category", "other")
          const response = await fetch(`/api/projects/${newProject.id}/files`, {
            method: "POST",
            body: formData,
          })
          if (response.ok) {
            const fileData = await response.json()
            uploadedFiles.push(toProjectFile(fileData))
          }
        } catch (fileErr) {
          console.error("Failed to upload file:", file.name, fileErr)
        }
      }
      newProject.files = uploadedFiles
    }

    setProjects(prev => [newProject, ...prev])
    return newProject
  }, [])

  const updateProject = useCallback(async (
    id: string,
    updates: Partial<Pick<Project, 'name' | 'description' | 'companyAddress' | 'tags'>>
  ) => {
    setError(null)
    await putApi(`/projects/${id}`, {
      name: updates.name,
      description: updates.description,
      company_address: updates.companyAddress,
      tags: updates.tags,
    })

    setProjects(prev => prev.map(p =>
      p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
    ))

    if (currentProject?.id === id) {
      setCurrentProject(prev => prev ? { ...prev, ...updates, updatedAt: new Date() } : null)
    }
  }, [currentProject])

  const deleteProject = useCallback(async (id: string) => {
    setError(null)
    await deleteApi(`/projects/${id}`)
    setProjects(prev => prev.filter(p => p.id !== id))
    if (currentProject?.id === id) {
      setCurrentProject(null)
      setCurrentChatId(null)
    }
  }, [currentProject])

  // ============================================
  // File Operations
  // ============================================

  const addFilesToProject = useCallback(async (projectId: string, files: File[], category: string) => {
    setError(null)
    const uploadedFiles: ProjectFile[] = []

    for (const file of files) {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("category", category)
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        body: formData,
      })
      if (!response.ok) throw new Error("Upload failed")
      const data = await response.json()
      uploadedFiles.push(toProjectFile(data))
    }

    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, files: [...p.files, ...uploadedFiles], updatedAt: new Date() }
        : p
    ))

    if (currentProject?.id === projectId) {
      setCurrentProject(prev => prev
        ? { ...prev, files: [...prev.files, ...uploadedFiles], updatedAt: new Date() }
        : null
      )
    }
  }, [currentProject])

  const removeFileFromProject = useCallback(async (projectId: string, fileId: string) => {
    setError(null)
    await deleteApi(`/projects/${projectId}/files/${fileId}`)

    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, files: p.files.filter(f => f.id !== fileId), updatedAt: new Date() }
        : p
    ))

    if (currentProject?.id === projectId) {
      setCurrentProject(prev => prev
        ? { ...prev, files: prev.files.filter(f => f.id !== fileId), updatedAt: new Date() }
        : null
      )
    }
  }, [currentProject])

  // ============================================
  // Project Chat Operations
  // ============================================

  const createChat = useCallback(async (projectId: string, title?: string): Promise<ProjectChat> => {
    setError(null)
    const data = await postApi<ChatResponse>(`/projects/${projectId}/chats`, { title })
    const newChat = toProjectChat(data)

    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, chats: [newChat, ...p.chats], updatedAt: new Date() }
        : p
    ))

    if (currentProject?.id === projectId) {
      setCurrentProject(prev => prev
        ? { ...prev, chats: [newChat, ...prev.chats], updatedAt: new Date() }
        : null
      )
    }

    setCurrentChatId(newChat.id)
    return newChat
  }, [currentProject])

  const loadChatMessages = useCallback(async (projectId: string, chatId: string) => {
    setError(null)
    const data = await fetchApi<MessageResponse[]>(`/chats/${chatId}/messages`)
    const messages = data.map(toMessage)

    const updateChats = (chats: ProjectChat[]) =>
      chats.map(c => c.id === chatId ? { ...c, messages, messageCount: messages.length } : c)

    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, chats: updateChats(p.chats) } : p
    ))

    if (currentProject?.id === projectId) {
      setCurrentProject(prev => prev ? { ...prev, chats: updateChats(prev.chats) } : null)
    }
  }, [currentProject])

  const addMessageToChat = useCallback(async (
    projectId: string,
    chatId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<ChatMessage> => {
    setError(null)
    const data = await postApi<MessageResponse>(`/chats/${chatId}/messages`, {
      role: message.role,
      content: message.content,
      search_modes: message.searchModes,
    })
    const newMessage = toMessage(data)

    const updateChats = (chats: ProjectChat[]) =>
      chats.map(c => c.id === chatId
        ? { ...c, messages: [...c.messages, newMessage], messageCount: c.messageCount + 1, updatedAt: new Date() }
        : c
      )

    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, chats: updateChats(p.chats), updatedAt: new Date() } : p
    ))

    if (currentProject?.id === projectId) {
      setCurrentProject(prev => prev ? { ...prev, chats: updateChats(prev.chats), updatedAt: new Date() } : null)
    }

    return newMessage
  }, [currentProject])

  const updateChatTitle = useCallback(async (projectId: string, chatId: string, title: string) => {
    setError(null)
    await putApi(`/chats/${chatId}`, { title })

    const updateChats = (chats: ProjectChat[]) =>
      chats.map(c => c.id === chatId ? { ...c, title, updatedAt: new Date() } : c)

    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, chats: updateChats(p.chats), updatedAt: new Date() } : p
    ))

    if (currentProject?.id === projectId) {
      setCurrentProject(prev => prev ? { ...prev, chats: updateChats(prev.chats), updatedAt: new Date() } : null)
    }
  }, [currentProject])

  const deleteChat = useCallback(async (projectId: string, chatId: string) => {
    setError(null)
    await deleteApi(`/chats/${chatId}`)

    const filterChats = (chats: ProjectChat[]) => chats.filter(c => c.id !== chatId)

    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, chats: filterChats(p.chats), updatedAt: new Date() } : p
    ))

    if (currentProject?.id === projectId) {
      setCurrentProject(prev => prev ? { ...prev, chats: filterChats(prev.chats), updatedAt: new Date() } : null)
    }

    if (currentChatId === chatId) setCurrentChatId(null)
  }, [currentProject, currentChatId])

  // ============================================
  // General Chat Operations
  // ============================================

  const loadGeneralChats = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchApi<ChatResponse[]>("/chats")
      setGeneralChats(data.map(toGeneralChat))
    } catch (err) {
      handleError(err, "Failed to load general chats")
    }
  }, [handleError])

  const createGeneralChat = useCallback(async (title?: string): Promise<GeneralChat> => {
    setError(null)
    const data = await postApi<ChatResponse>("/chats", { title })
    const newChat = toGeneralChat(data)
    setGeneralChats(prev => [newChat, ...prev])
    setCurrentGeneralChatId(newChat.id)
    setCurrentProject(null)
    setCurrentChatId(null)
    return newChat
  }, [])

  const addMessageToGeneralChat = useCallback(async (
    chatId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<ChatMessage> => {
    setError(null)
    const data = await postApi<MessageResponse>(`/chats/${chatId}/messages`, {
      role: message.role,
      content: message.content,
      search_modes: message.searchModes,
    })
    const newMessage = toMessage(data)

    setGeneralChats(prev => prev.map(c =>
      c.id === chatId
        ? { ...c, messages: [...c.messages, newMessage], messageCount: c.messageCount + 1, updatedAt: new Date() }
        : c
    ))

    return newMessage
  }, [])

  const updateGeneralChatTitle = useCallback(async (chatId: string, title: string) => {
    setError(null)
    await putApi(`/chats/${chatId}`, { title })
    setGeneralChats(prev => prev.map(c =>
      c.id === chatId ? { ...c, title, updatedAt: new Date() } : c
    ))
  }, [])

  const deleteGeneralChat = useCallback(async (chatId: string) => {
    setError(null)
    await deleteApi(`/chats/${chatId}`)
    setGeneralChats(prev => prev.filter(c => c.id !== chatId))
    if (currentGeneralChatId === chatId) setCurrentGeneralChatId(null)
  }, [currentGeneralChatId])

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
      addFilesToProject,
      removeFileFromProject,
      createChat,
      setCurrentChatId,
      loadChatMessages,
      addMessageToChat,
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
