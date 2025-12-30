"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { Project, ProjectFile } from "@/types/project"

interface ProjectContextType {
  projects: Project[]
  currentProject: Project | null
  createProject: (name: string, description: string, files: ProjectFile[]) => Project
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  setCurrentProject: (project: Project | null) => void
  addFilesToProject: (projectId: string, files: ProjectFile[]) => void
  removeFileFromProject: (projectId: string, fileId: string) => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)

  const createProject = useCallback((name: string, description: string, files: ProjectFile[]): Project => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      description,
      files,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setProjects(prev => [newProject, ...prev])
    return newProject
  }, [])

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
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

  return (
    <ProjectContext.Provider value={{
      projects,
      currentProject,
      createProject,
      updateProject,
      deleteProject,
      setCurrentProject,
      addFilesToProject,
      removeFileFromProject,
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
