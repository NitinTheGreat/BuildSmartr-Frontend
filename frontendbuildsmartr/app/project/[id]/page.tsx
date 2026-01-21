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

  // Show loading state with crafted skeleton
  if (isLoading || !currentProject || currentProject.id !== projectId) {
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
