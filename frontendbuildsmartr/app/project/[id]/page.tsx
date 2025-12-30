"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useProjects } from "@/contexts/ProjectContext"
import { ProjectChatInterface } from "@/components/ProjectChatInterface"

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const { projects, currentProject, setCurrentProject } = useProjects()
  
  const projectId = params.id as string

  useEffect(() => {
    // Find the project by ID
    const project = projects.find(p => p.id === projectId)
    
    if (project) {
      setCurrentProject(project)
    } else if (projects.length > 0) {
      // Project not found, redirect to chat
      router.push('/chat')
    }
  }, [projectId, projects, setCurrentProject, router])

  // Show loading or not found state
  if (!currentProject || currentProject.id !== projectId) {
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
