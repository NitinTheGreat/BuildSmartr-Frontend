"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useProjects } from "@/contexts/ProjectContext"
import { ProjectOverview } from "@/components/ProjectOverview"
import { ChatView } from "@/components/ChatView"
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
  const {
    projects,
    setCurrentProject,
    currentChatId,
    setCurrentChatId,
    refreshProjects,
    isLoading: isContextLoading
  } = useProjects()
  const hasInitializedRef = useRef(false)

  // Find project in context (prioritize context over initial)
  const projectFromContext = projects.find(p => p.id === projectId)
  const displayProject = projectFromContext || initialProject

  // Set current project on mount (only once)
  useEffect(() => {
    if (hasInitializedRef.current) return

    if (displayProject) {
      hasInitializedRef.current = true
      setCurrentProject(displayProject)
    }
  }, [displayProject, setCurrentProject])

  // Handle project not found (only after context has loaded)
  useEffect(() => {
    if (!isContextLoading && projects.length > 0 && !displayProject) {
      // Project not found after context loaded, redirect to home
      router.push('/')
    }
  }, [isContextLoading, projects.length, displayProject, router])

  // Show loading while we don't have project data
  if (!displayProject) {
    return <ProjectSkeleton />
  }

  // If a chat is selected, show ChatView (new architecture)
  if (currentChatId) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ChatView
          project={displayProject}
          chatId={currentChatId}
          onChatIdChange={setCurrentChatId}
          onBack={() => setCurrentChatId(null)}
          refreshProjects={refreshProjects}
        />
      </motion.div>
    )
  }

  // Otherwise show project overview
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ProjectOverview
        project={displayProject}
        onSelectChat={(chatId) => setCurrentChatId(chatId)}
        onNewChat={() => {
          // Will be handled by ProjectOverview - it can start a new chat
          // which will trigger ChatView
        }}
        refreshProjects={refreshProjects}
      />
    </motion.div>
  )
}
