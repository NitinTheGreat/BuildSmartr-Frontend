"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useProjects } from "@/contexts/ProjectContext"
import { ProjectChatInterface } from "@/components/ProjectChatInterface"
import { ProjectSkeleton } from "@/components/ui/skeletons"
import { motion } from "framer-motion"

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const { projects, currentProject, setCurrentProject, loadProject, isLoading: isContextLoading } = useProjects()
  const [isPageLoading, setIsPageLoading] = useState(true)
  const hasLoadedRef = useRef(false)
  const projectId = params.id as string

  useEffect(() => {
    // Prevent duplicate loads
    if (hasLoadedRef.current) return

    const initializeProject = async () => {
      // Check if we already have this project in the list
      const existingProject = projects.find(p => p.id === projectId)
      
      // If context is still doing initial load and we don't have the project yet, wait
      if (isContextLoading && !existingProject) {
        return
      }

      hasLoadedRef.current = true
      setIsPageLoading(true)

      // Load full project details (including files and chats)
      const fullProject = await loadProject(projectId)

      if (fullProject) {
        setCurrentProject(fullProject)
      } else {
        // Project not found, redirect to home
        router.push('/')
        return
      }

      setIsPageLoading(false)
    }

    initializeProject()
  }, [projectId, projects, isContextLoading, loadProject, setCurrentProject, router])

  // Show loading state with enhanced skeleton
  if (isPageLoading || !currentProject || currentProject.id !== projectId) {
    return <ProjectSkeleton />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ProjectChatInterface project={currentProject} />
    </motion.div>
  )
}
