"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useProjects } from "@/contexts/ProjectContext"
import { ProjectChatInterface } from "@/components/ProjectChatInterface"
import { PageSkeleton } from "@/components/Skeleton"

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
      
      // Check if we have cached data with files/chats already loaded
      const cached = projects.find(p => p.id === projectId)
      if (cached && cached.files && cached.files.length > 0) {
        // Use cached data immediately for instant display
        setCurrentProject(cached)
        setIsLoading(false)
        // Refresh in background (non-blocking) to get latest data
        loadProject(projectId)
        return
      }
      
      // No cached data, need to fetch
      setIsLoading(true)
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
    return <PageSkeleton />
  }

  return (
    <div className="animate-fade-in">
      <ProjectChatInterface project={currentProject} />
    </div>
  )
}
