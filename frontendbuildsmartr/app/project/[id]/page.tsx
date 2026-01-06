"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useProjects } from "@/contexts/ProjectContext"
import { ProjectChatInterface } from "@/components/ProjectChatInterface"

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const { projects, currentProject, setCurrentProject, loadProject } = useProjects()
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedRef = useRef(false)
  
  const projectId = params.id as string

  useEffect(() => {
    // Prevent duplicate loads
    if (hasLoadedRef.current) return
    
    const initializeProject = async () => {
      // Wait for projects to be loaded first
      if (projects.length === 0) return
      
      hasLoadedRef.current = true
      setIsLoading(true)
      
      // Load full project details (including files and chats)
      const fullProject = await loadProject(projectId)
      
      if (fullProject) {
        setCurrentProject(fullProject)
      } else {
        // Project not found, redirect to chat
        router.push('/chat')
        return
      }
      
      setIsLoading(false)
    }

    initializeProject()
  }, [projectId, projects.length]) // Only depend on projectId and projects.length

  // Show loading state
  if (isLoading || !currentProject || currentProject.id !== projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  return <ProjectChatInterface project={currentProject} />
}
