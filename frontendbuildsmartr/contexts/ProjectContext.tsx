"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { Project, ProjectFile, ProjectChat, ChatMessage, GeneralChat } from "@/types/project"
import type { 
  ProjectResponse,
  ChatResponse,
  MessageResponse,
  ProjectFileResponse
} from "@/types/api"
import { createClient } from "@/utils/supabase/client"

// ============================================
// Fetch Helper
// ============================================

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }))
    throw new Error(error.error || response.statusText)
  }

  return response.json()
}

// ============================================
// Type Converters
// ============================================

function toProject(res: ProjectResponse): Project {
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
  }
}

function toProjectFile(res: ProjectFileResponse): ProjectFile {
  return {
    id: res.id,
    name: res.name,
    size: res.size,
    type: res.type,
    category: res.category,
    url: res.url || undefined,
  }
}

function toProjectChat(res: ChatResponse): ProjectChat {
  return {
    id: res.id,
    title: res.title,
    messages: (res.messages || []).map(toMessage),
    createdAt: new Date(res.created_at),
    updatedAt: new Date(res.updated_at),
  }
}

function toGeneralChat(res: ChatResponse): GeneralChat {
  return {
    id: res.id,
    title: res.title,
    messages: (res.messages || []).map(toMessage),
    createdAt: new Date(res.created_at),
    updatedAt: new Date(res.updated_at),
  }
}

function toMessage(res: MessageResponse): ChatMessage {
  return {
    id: res.id,
    role: res.role,
    content: res.content,
    timestamp: new Date(res.timestamp),
    searchModes: res.search_modes as ChatMessage['searchModes'] || undefined,
  }
}

// ============================================
// Context
// ============================================

interface ProjectContextType {
  projects: Project[]
  currentProject: Project | null
  currentChatId: string | null
  generalChats: GeneralChat[]
  currentGeneralChatId: string | null
  isLoading: boolean
  error: string | null
  // Project management
  loadProjects: () => Promise<void>
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

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [generalChats, setGeneralChats] = useState<GeneralChat[]>([])
  const [currentGeneralChatId, setCurrentGeneralChatId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false)

  // Load data on auth state change
  useEffect(() => {
    const supabase = createClient()
    let isMounted = true
    
    const loadData = async () => {
      // Prevent duplicate loads
      if (hasLoadedInitialData) return
      
      const { data: { session } } = await supabase.auth.getSession()
      if (session && isMounted) {
        setHasLoadedInitialData(true)
        loadProjects()
        loadGeneralChats()
      }
    }
    
    loadData()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      
      if (session && event === 'SIGNED_IN' && !hasLoadedInitialData) {
        setHasLoadedInitialData(true)
        loadProjects()
        loadGeneralChats()
      } else if (event === 'TOKEN_REFRESHED') {
        // Token refresh doesn't need to reload data
      } else if (event === 'SIGNED_OUT') {
        setProjects([])
        setGeneralChats([])
        setCurrentProject(null)
        setCurrentChatId(null)
        setCurrentGeneralChatId(null)
        setHasLoadedInitialData(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ============================================
  // Project Management
  // ============================================

  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchApi<ProjectResponse[]>("/projects")
      setProjects(data.map(toProject))
    } catch (err) {
      console.error("Failed to load projects:", err)
      setError(err instanceof Error ? err.message : "Failed to load projects")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createProject = useCallback(async (
    name: string, 
    description: string, 
    companyAddress: string, 
    tags: string[], 
    files: File[]
  ): Promise<Project> => {
    try {
      setError(null)
      
      const data = await fetchApi<ProjectResponse>("/projects", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          company_address: companyAddress,
          tags,
        }),
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
    } catch (err) {
      console.error("Failed to create project:", err)
      setError(err instanceof Error ? err.message : "Failed to create project")
      throw err
    }
  }, [])

  const updateProject = useCallback(async (
    id: string, 
    updates: Partial<Pick<Project, 'name' | 'description' | 'companyAddress' | 'tags'>>
  ) => {
    try {
      setError(null)
      await fetchApi(`/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: updates.name,
          description: updates.description,
          company_address: updates.companyAddress,
          tags: updates.tags,
        }),
      })
      
      setProjects(prev => prev.map(p => 
        p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
      ))
      
      if (currentProject?.id === id) {
        setCurrentProject(prev => prev ? { ...prev, ...updates, updatedAt: new Date() } : null)
      }
    } catch (err) {
      console.error("Failed to update project:", err)
      setError(err instanceof Error ? err.message : "Failed to update project")
      throw err
    }
  }, [currentProject])

  const deleteProject = useCallback(async (id: string) => {
    try {
      setError(null)
      await fetchApi(`/projects/${id}`, { method: "DELETE" })
      
      setProjects(prev => prev.filter(p => p.id !== id))
      
      if (currentProject?.id === id) {
        setCurrentProject(null)
        setCurrentChatId(null)
      }
    } catch (err) {
      console.error("Failed to delete project:", err)
      setError(err instanceof Error ? err.message : "Failed to delete project")
      throw err
    }
  }, [currentProject])

  // ============================================
  // File Management
  // ============================================

  const addFilesToProject = useCallback(async (projectId: string, files: File[], category: string) => {
    try {
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
        
        if (!response.ok) {
          throw new Error("Upload failed")
        }
        
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
    } catch (err) {
      console.error("Failed to upload files:", err)
      setError(err instanceof Error ? err.message : "Failed to upload files")
      throw err
    }
  }, [currentProject])

  const removeFileFromProject = useCallback(async (projectId: string, fileId: string) => {
    try {
      setError(null)
      await fetchApi(`/projects/${projectId}/files/${fileId}`, { method: "DELETE" })
      
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
    } catch (err) {
      console.error("Failed to delete file:", err)
      setError(err instanceof Error ? err.message : "Failed to delete file")
      throw err
    }
  }, [currentProject])

  // ============================================
  // Project Chat Management
  // ============================================

  const createChat = useCallback(async (projectId: string, title?: string): Promise<ProjectChat> => {
    try {
      setError(null)
      const data = await fetchApi<ChatResponse>(`/projects/${projectId}/chats`, {
        method: "POST",
        body: JSON.stringify({ title }),
      })
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
    } catch (err) {
      console.error("Failed to create chat:", err)
      setError(err instanceof Error ? err.message : "Failed to create chat")
      throw err
    }
  }, [currentProject])

  const addMessageToChat = useCallback(async (
    projectId: string, 
    chatId: string, 
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<ChatMessage> => {
    try {
      setError(null)
      const data = await fetchApi<MessageResponse>(`/chats/${chatId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          role: message.role,
          content: message.content,
          search_modes: message.searchModes,
        }),
      })
      const newMessage = toMessage(data)
      
      const updateChats = (chats: ProjectChat[]) => 
        chats.map(c => c.id === chatId 
          ? { ...c, messages: [...c.messages, newMessage], updatedAt: new Date() }
          : c
        )
      
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, chats: updateChats(p.chats), updatedAt: new Date() }
          : p
      ))
      
      if (currentProject?.id === projectId) {
        setCurrentProject(prev => prev 
          ? { ...prev, chats: updateChats(prev.chats), updatedAt: new Date() }
          : null
        )
      }
      
      return newMessage
    } catch (err) {
      console.error("Failed to add message:", err)
      setError(err instanceof Error ? err.message : "Failed to add message")
      throw err
    }
  }, [currentProject])

  const updateChatTitle = useCallback(async (projectId: string, chatId: string, title: string) => {
    try {
      setError(null)
      await fetchApi(`/chats/${chatId}`, {
        method: "PUT",
        body: JSON.stringify({ title }),
      })
      
      const updateChats = (chats: ProjectChat[]) => 
        chats.map(c => c.id === chatId 
          ? { ...c, title, updatedAt: new Date() }
          : c
        )
      
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, chats: updateChats(p.chats), updatedAt: new Date() }
          : p
      ))
      
      if (currentProject?.id === projectId) {
        setCurrentProject(prev => prev 
          ? { ...prev, chats: updateChats(prev.chats), updatedAt: new Date() }
          : null
        )
      }
    } catch (err) {
      console.error("Failed to update chat title:", err)
      setError(err instanceof Error ? err.message : "Failed to update chat title")
      throw err
    }
  }, [currentProject])

  const deleteChat = useCallback(async (projectId: string, chatId: string) => {
    try {
      setError(null)
      await fetchApi(`/chats/${chatId}`, { method: "DELETE" })
      
      const filterChats = (chats: ProjectChat[]) => chats.filter(c => c.id !== chatId)
      
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, chats: filterChats(p.chats), updatedAt: new Date() }
          : p
      ))
      
      if (currentProject?.id === projectId) {
        setCurrentProject(prev => prev 
          ? { ...prev, chats: filterChats(prev.chats), updatedAt: new Date() }
          : null
        )
      }
      
      if (currentChatId === chatId) {
        setCurrentChatId(null)
      }
    } catch (err) {
      console.error("Failed to delete chat:", err)
      setError(err instanceof Error ? err.message : "Failed to delete chat")
      throw err
    }
  }, [currentProject, currentChatId])

  // ============================================
  // General Chat Management
  // ============================================

  const loadGeneralChats = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchApi<ChatResponse[]>("/chats")
      setGeneralChats(data.map(toGeneralChat))
    } catch (err) {
      console.error("Failed to load general chats:", err)
    }
  }, [])

  const createGeneralChat = useCallback(async (title?: string): Promise<GeneralChat> => {
    try {
      setError(null)
      const data = await fetchApi<ChatResponse>("/chats", {
        method: "POST",
        body: JSON.stringify({ title }),
      })
      const newChat = toGeneralChat(data)
      
      setGeneralChats(prev => [newChat, ...prev])
      setCurrentGeneralChatId(newChat.id)
      setCurrentProject(null)
      setCurrentChatId(null)
      
      return newChat
    } catch (err) {
      console.error("Failed to create general chat:", err)
      setError(err instanceof Error ? err.message : "Failed to create chat")
      throw err
    }
  }, [])

  const addMessageToGeneralChat = useCallback(async (
    chatId: string, 
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<ChatMessage> => {
    try {
      setError(null)
      const data = await fetchApi<MessageResponse>(`/chats/${chatId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          role: message.role,
          content: message.content,
          search_modes: message.searchModes,
        }),
      })
      const newMessage = toMessage(data)
      
      setGeneralChats(prev => prev.map(c => 
        c.id === chatId 
          ? { ...c, messages: [...c.messages, newMessage], updatedAt: new Date() }
          : c
      ))
      
      return newMessage
    } catch (err) {
      console.error("Failed to add message:", err)
      setError(err instanceof Error ? err.message : "Failed to add message")
      throw err
    }
  }, [])

  const updateGeneralChatTitle = useCallback(async (chatId: string, title: string) => {
    try {
      setError(null)
      await fetchApi(`/chats/${chatId}`, {
        method: "PUT",
        body: JSON.stringify({ title }),
      })
      
      setGeneralChats(prev => prev.map(c => 
        c.id === chatId 
          ? { ...c, title, updatedAt: new Date() }
          : c
      ))
    } catch (err) {
      console.error("Failed to update chat title:", err)
      setError(err instanceof Error ? err.message : "Failed to update chat title")
      throw err
    }
  }, [])

  const deleteGeneralChat = useCallback(async (chatId: string) => {
    try {
      setError(null)
      await fetchApi(`/chats/${chatId}`, { method: "DELETE" })
      
      setGeneralChats(prev => prev.filter(c => c.id !== chatId))
      
      if (currentGeneralChatId === chatId) {
        setCurrentGeneralChatId(null)
      }
    } catch (err) {
      console.error("Failed to delete chat:", err)
      setError(err instanceof Error ? err.message : "Failed to delete chat")
      throw err
    }
  }, [currentGeneralChatId])

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
      createProject,
      updateProject,
      deleteProject,
      setCurrentProject,
      addFilesToProject,
      removeFileFromProject,
      createChat,
      setCurrentChatId,
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
