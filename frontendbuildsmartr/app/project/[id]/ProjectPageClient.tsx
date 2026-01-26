"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useProjects } from "@/contexts/ProjectContext"
import { ProjectChatInterface } from "@/components/ProjectChatInterface"
import { ProjectSkeleton } from "@/components/ui/skeletons"
import { motion } from "framer-motion"
import type { Project } from "@/types/project"

interface ProjectPageClientProps {
  projectId: string
  /** Pre-fetched project from server for instant render */
  initialProject: Project | null
}

export function ProjectPageClient({ projectId, initialProject }: ProjectPageClientProps) {
  const router = useRouter()
  const { projects, currentProject, setCurrentProject, loadProject, isLoading: isContextLoading } = useProjects()
  const [isPageLoading, setIsPageLoading] = useState(!initialProject)
  const hasLoadedRef = useRef(false)

  // Use initial project immediately for instant render
  const displayProject = currentProject?.id === projectId 
    ? currentProject 
    : initialProject

  useEffect(() => {
    // Prevent duplicate loads
    if (hasLoadedRef.current) return

    const initializeProject = async () => {
      // If we have initial data, set it immediately
      if (initialProject && !currentProject) {
        setCurrentProject(initialProject)
      }

      // Check if we already have this project in the list
      const existingProject = projects.find(p => p.id === projectId)
      
      // If context is still doing initial load and we don't have the project yet, wait
      if (isContextLoading && !existingProject && !initialProject) {
        return
      }

      hasLoadedRef.current = true

      // If we don't have initial data, load from API
      if (!initialProject) {
        setIsPageLoading(true)
        const fullProject = await loadProject(projectId)

        if (fullProject) {
          setCurrentProject(fullProject)
        } else {
          // Project not found, redirect to home
          router.push('/')
          return
        }
        setIsPageLoading(false)
      } else {
        // We have initial data, but still load fresh data in background
        loadProject(projectId).then(fullProject => {
          if (fullProject) {
            setCurrentProject(fullProject)
          }
        })
      }
    }

    initializeProject()
  }, [projectId, projects, isContextLoading, loadProject, setCurrentProject, router, initialProject, currentProject])

  // Show loading state only if we don't have any project data
  if (isPageLoading && !displayProject) {
    return <ProjectSkeleton />
  }

  // If we still don't have a project to display, show loading
  if (!displayProject) {
    return <ProjectSkeleton />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ProjectChatInterface project={displayProject} />
    </motion.div>
  )
}
