"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { FolderPlus, FolderOpen, ArrowRight, MessageSquare } from "lucide-react"
import { useRouter } from "next/navigation"
import { useProjects } from "@/contexts/ProjectContext"
import type { SearchMode } from "@/types/project"
import { NewProjectModal } from "./NewProjectModal"
import { createClient } from "@/utils/supabase/client"
import { HomepageSkeleton } from "@/components/ui/skeletons"

export function GeneralChatInterface() {
  const [query, setQuery] = useState("")
  const [selectedModes, setSelectedModes] = useState<SearchMode[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const {
    projects,
    generalChats,
    currentGeneralChatId,
    createGeneralChat,
    addMessageToGeneralChat,
    updateGeneralChatTitle,
    setCurrentProject,
    isLoading: isProjectsLoading,
  } = useProjects()

  const currentChat = generalChats.find(c => c.id === currentGeneralChatId)
  const messages = currentChat?.messages || []

  // Fetch user name from Supabase
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // Try to get name from user_metadata or email
        const firstName = user.user_metadata?.first_name ||
          user.user_metadata?.full_name?.split(' ')[0] ||
          user.email?.split('@')[0] ||
          null
        setUserName(firstName)
      }
    })
  }, [])

  // Auto-expand textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [query])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleProjectClick = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setCurrentProject(project)
      router.push(`/project/${projectId}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isSubmitting) return

    setIsSubmitting(true)
    const currentQuery = query.trim()

    try {
      let chatId = currentGeneralChatId
      if (!chatId) {
        const newChat = await createGeneralChat(currentQuery.slice(0, 50))
        chatId = newChat.id
      }

      const userMessage = {
        role: 'user' as const,
        content: currentQuery,
        searchModes: selectedModes.length > 0 ? selectedModes : undefined,
      }

      await addMessageToGeneralChat(chatId, userMessage)

      // Update chat title if it's the first message
      const chat = generalChats.find(c => c.id === chatId)
      if (chat && chat.messages.length === 0) {
        await updateGeneralChatTitle(chatId, currentQuery.slice(0, 50))
      }

      setQuery("")

      // Simulate AI response
      setTimeout(async () => {
        const modesText = selectedModes.length > 0
          ? `Using ${selectedModes.join(', ')} mode(s), `
          : ''
        const assistantMessage = {
          role: 'assistant' as const,
          content: `${modesText}I understand you're asking about "${currentQuery}". How can I help you further?`,
        }
        await addMessageToGeneralChat(chatId!, assistantMessage)
      }, 1000)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading screen while projects are being loaded
  if (isProjectsLoading && projects.length === 0) {
    return <HomepageSkeleton />
  }

  // Project-focused welcome screen (dashboard view)
  if (!currentChat) {
    return (
      <>
        <NewProjectModal
          isOpen={isNewProjectModalOpen}
          onClose={() => setIsNewProjectModalOpen(false)}
        />
        <motion.main
          className="min-h-screen flex flex-col px-4 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 60px)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)',
          }}
        >
          <div className="w-full max-w-4xl mx-auto">
            {/* Header */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                <span className="text-foreground">Welcome{userName ? `, ${userName}` : ''}</span>
              </h1>
              <p className="text-muted-foreground text-lg">
                Manage your construction projects with AI-powered insights
              </p>
            </motion.div>

            {/* New Project CTA - Prominent */}
            {projects.length === 0 ? (
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className="bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FolderPlus className="w-8 h-8 text-accent" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">Create your first project</h2>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Upload your construction documents, connect your email, and let IIvy help you find answers instantly.
                  </p>
                  <Button
                    onClick={() => setIsNewProjectModalOpen(true)}
                    className="bg-accent hover:bg-accent-strong text-background px-6 py-2 rounded-lg font-medium cursor-pointer"
                  >
                    <FolderPlus className="w-4 h-4 mr-2" />
                    New Project
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <Button
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className="bg-accent hover:bg-accent-strong text-background px-5 py-2.5 rounded-lg font-medium cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </motion.div>
            )}

            {/* Projects Grid */}
            {projects.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Your Projects</h2>
                  <span className="text-sm text-muted-foreground">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project, index) => (
                    <motion.button
                      key={project.id}
                      onClick={() => handleProjectClick(project.id)}
                      className="flex flex-col p-5 bg-surface border border-border rounded-xl hover:border-accent/50 hover:shadow-lg transition-all text-left group cursor-pointer"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.05, duration: 0.4 }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2.5 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                          <FolderOpen className="w-5 h-5 text-accent" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-accent transition-all" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{project.name}</h3>
                      {project.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.main>
      </>
    )
  }

  // Chat view with messages
  return (
    <motion.div
      className="min-h-screen flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div
        className="sticky z-10 bg-background/80 backdrop-blur-md border-b border-border/50"
        style={{
          top: 0,
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-accent" />
          <h1 className="font-semibold text-foreground truncate">{currentChat.title}</h1>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scroll-smooth-ios">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[80%] px-4 py-3 rounded-2xl
                  ${message.role === 'user'
                    ? 'bg-accent text-background rounded-br-md'
                    : 'bg-[#111827] text-foreground rounded-bl-md'
                  }
                `}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input at bottom */}
      <div
        className="sticky bg-background/95 backdrop-blur-md border-t border-border/50 z-20 overflow-visible"
        style={{
          bottom: 0,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 py-3 md:py-4">
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative bg-surface rounded-xl border border-border shadow-sm hover:border-muted transition-colors overflow-visible">
              <div className="flex items-start gap-3 p-3">
                <textarea
                  ref={textareaRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Message..."
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[24px] max-h-[200px] py-1"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                />

                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!query.trim() || isSubmitting}
                    className="bg-accent hover:bg-accent-strong text-background rounded-lg disabled:opacity-50 h-9 w-9 md:h-8 md:w-8 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                    aria-label="Send"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20l16-8-16-8v6l12 2-12 2v6z" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  )
}
