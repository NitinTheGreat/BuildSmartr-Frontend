"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { Project, ProjectFile, ProjectChat, ChatMessage, GeneralChat } from "@/types/project"

interface ProjectContextType {
  projects: Project[]
  currentProject: Project | null
  currentChatId: string | null
  generalChats: GeneralChat[]
  currentGeneralChatId: string | null
  createProject: (name: string, description: string, files: ProjectFile[]) => Project
  updateProject: (id: string, updates: Partial<Pick<Project, 'name' | 'description'>>) => void
  deleteProject: (id: string) => void
  setCurrentProject: (project: Project | null) => void
  addFilesToProject: (projectId: string, files: ProjectFile[]) => void
  removeFileFromProject: (projectId: string, fileId: string) => void
  // Project Chat management
  createChat: (projectId: string, title?: string) => ProjectChat
  setCurrentChatId: (chatId: string | null) => void
  addMessageToChat: (projectId: string, chatId: string, message: ChatMessage) => void
  updateChatTitle: (projectId: string, chatId: string, title: string) => void
  deleteChat: (projectId: string, chatId: string) => void
  // General Chat management
  createGeneralChat: (title?: string) => GeneralChat
  setCurrentGeneralChatId: (chatId: string | null) => void
  addMessageToGeneralChat: (chatId: string, message: ChatMessage) => void
  updateGeneralChatTitle: (chatId: string, title: string) => void
  deleteGeneralChat: (chatId: string) => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [generalChats, setGeneralChats] = useState<GeneralChat[]>([])
  const [currentGeneralChatId, setCurrentGeneralChatId] = useState<string | null>(null)

  const createProject = useCallback((name: string, description: string, files: ProjectFile[]): Project => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      description,
      files,
      chats: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setProjects(prev => [newProject, ...prev])
    return newProject
  }, [])

  const updateProject = useCallback((id: string, updates: Partial<Pick<Project, 'name' | 'description'>>) => {
    setProjects(prev => prev.map(p => 
      p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
    ))
    if (currentProject?.id === id) {
      setCurrentProject(prev => prev ? { ...prev, ...updates, updatedAt: new Date() } : null)
    }
  }, [currentProject])

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    if (currentProject?.id === id) {
      setCurrentProject(null)
      setCurrentChatId(null)
    }
  }, [currentProject])

  const addFilesToProject = useCallback((projectId: string, files: ProjectFile[]) => {
    setProjects(prev => prev.map(p => 
      p.id === projectId 
        ? { ...p, files: [...p.files, ...files], updatedAt: new Date() }
        : p
    ))
    if (currentProject?.id === projectId) {
      setCurrentProject(prev => prev 
        ? { ...prev, files: [...prev.files, ...files], updatedAt: new Date() }
        : null
      )
    }
  }, [currentProject])

  const removeFileFromProject = useCallback((projectId: string, fileId: string) => {
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

  // Chat management functions
  const createChat = useCallback((projectId: string, title?: string): ProjectChat => {
    const newChat: ProjectChat = {
      id: crypto.randomUUID(),
      title: title || 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

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

  const addMessageToChat = useCallback((projectId: string, chatId: string, message: ChatMessage) => {
    const updateChats = (chats: ProjectChat[]) => 
      chats.map(c => c.id === chatId 
        ? { ...c, messages: [...c.messages, message], updatedAt: new Date() }
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
  }, [currentProject])

  const updateChatTitle = useCallback((projectId: string, chatId: string, title: string) => {
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
  }, [currentProject])

  const deleteChat = useCallback((projectId: string, chatId: string) => {
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
  }, [currentProject, currentChatId])

  // General Chat management functions
  const createGeneralChat = useCallback((title?: string): GeneralChat => {
    const newChat: GeneralChat = {
      id: crypto.randomUUID(),
      title: title || 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setGeneralChats(prev => [newChat, ...prev])
    setCurrentGeneralChatId(newChat.id)
    setCurrentProject(null)
    setCurrentChatId(null)
    return newChat
  }, [])

  const addMessageToGeneralChat = useCallback((chatId: string, message: ChatMessage) => {
    setGeneralChats(prev => prev.map(c => 
      c.id === chatId 
        ? { ...c, messages: [...c.messages, message], updatedAt: new Date() }
        : c
    ))
  }, [])

  const updateGeneralChatTitle = useCallback((chatId: string, title: string) => {
    setGeneralChats(prev => prev.map(c => 
      c.id === chatId 
        ? { ...c, title, updatedAt: new Date() }
        : c
    ))
  }, [])

  const deleteGeneralChat = useCallback((chatId: string) => {
    setGeneralChats(prev => prev.filter(c => c.id !== chatId))
    if (currentGeneralChatId === chatId) {
      setCurrentGeneralChatId(null)
    }
  }, [currentGeneralChatId])

  return (
    <ProjectContext.Provider value={{
      projects,
      currentProject,
      currentChatId,
      generalChats,
      currentGeneralChatId,
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
