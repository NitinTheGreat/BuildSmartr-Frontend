"use client"

import type React from "react"
import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { X, MessageSquare, FolderPlus, FolderOpen, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useProjects } from "@/contexts/ProjectContext"
import { useUser } from "@/contexts/UserContext"
import type { SearchMode } from "@/types/project"
import { NewProjectModal } from "./NewProjectModal"
import { getModeIcon, getModeLabel, isModeExclusive } from "@/lib/constants"

export function GeneralChatInterface() {
  const [query, setQuery] = useState("")
  const [selectedModes, setSelectedModes] = useState<SearchMode[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const { user } = useUser()
  const { 
    projects,
    generalChats,
    currentGeneralChatId,
    createGeneralChat,
    addMessageToGeneralChat,
    updateGeneralChatTitle,
    setCurrentProject,
  } = useProjects()

  const currentChat = generalChats.find(c => c.id === currentGeneralChatId)
  const messages = currentChat?.messages || []

  // Memoize rendered messages to avoid re-renders on unrelated state changes
  const renderedMessages = useMemo(() => messages.map((message) => (
    <div
      key={message.id}
      className={`flex animate-fade-in-up ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`
          max-w-[80%] px-4 py-3 rounded-2xl
          ${message.role === 'user'
            ? 'bg-accent text-background rounded-br-md'
            : 'bg-[#2b2d31] text-foreground rounded-bl-md'
          }
        `}
      >
        {/* Show search modes if present */}
        {message.searchModes && message.searchModes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {message.searchModes.map(mode => {
              const Icon = getModeIcon(mode)
              return (
                <span
                  key={mode}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                    message.role === 'user' 
                      ? 'bg-background/20 text-background' 
                      : 'bg-accent/20 text-accent'
                  }`}
                >
                  <Icon className="w-2.5 h-2.5" />
                  {getModeLabel(mode)}
                </span>
              )
            })}
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )), [messages])

  // Auto-expand textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [query])

  // Smooth scroll to bottom with requestAnimationFrame
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    })
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

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

  const handleModeToggle = (mode: SearchMode) => {
    if (isModeExclusive(mode)) {
      if (selectedModes.includes(mode)) {
        setSelectedModes([])
      } else {
        setSelectedModes([mode])
      }
    } else {
      if (selectedModes.includes('pdf')) {
        setSelectedModes([mode])
      } else if (selectedModes.includes(mode)) {
        setSelectedModes(prev => prev.filter(m => m !== mode))
      } else {
        setSelectedModes(prev => [...prev, mode])
      }
    }
  }

  const removeMode = (mode: SearchMode) => {
    setSelectedModes(prev => prev.filter(m => m !== mode))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isSubmitting) return

    // Capture query and clear input IMMEDIATELY for snappy feel
    const currentQuery = query.trim()
    setQuery("")
    setIsSubmitting(true)
    
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

      // Add message optimistically (no await - updates UI immediately)
      addMessageToGeneralChat(chatId, userMessage)

      // Update chat title in background (fire-and-forget)
      const chat = generalChats.find(c => c.id === chatId)
      if (chat && chat.messages.length === 0) {
        updateGeneralChatTitle(chatId, currentQuery.slice(0, 50))
      }

      // Unlock input faster
      setIsSubmitting(false)

      // Simulate AI response
      setTimeout(() => {
        const modesText = selectedModes.length > 0 
          ? `Using ${selectedModes.join(', ')} mode(s), ` 
          : ''
        const assistantMessage = {
          role: 'assistant' as const,
          content: `${modesText}I understand you're asking about "${currentQuery}". How can I help you further?`,
        }
        addMessageToGeneralChat(chatId!, assistantMessage)
      }, 1000)
    } catch {
      setIsSubmitting(false)
    }
  }

  const handleProjectClick = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setCurrentProject(project)
      router.push(`/project/${projectId}`)
    }
  }

  // Project-focused welcome screen (no general chat for demo)
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
                <span className="text-foreground">Welcome{user.firstName ? `, ${user.firstName}` : ''}</span>
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
                    className="bg-accent hover:bg-accent-strong text-background px-6 py-2 rounded-lg font-medium"
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
                  className="bg-accent hover:bg-accent-strong text-background px-5 py-2.5 rounded-lg font-medium"
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
                      className="flex flex-col p-5 bg-surface border border-border rounded-xl hover:border-accent/50 hover:shadow-lg transition-all text-left group"
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
                      <div className="mt-auto pt-3 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{project.files.length} file{project.files.length !== 1 ? 's' : ''}</span>
                        <span>{project.chats.length} chat{project.chats.length !== 1 ? 's' : ''}</span>
                      </div>
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
          {/* Use memoized messages for better performance */}
          {renderedMessages}
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
              {/* Selected modes chips */}
              <AnimatePresence>
                {selectedModes.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-3 pt-2 flex flex-wrap gap-1.5"
                  >
                    {selectedModes.map(mode => {
                      const Icon = getModeIcon(mode)
                      return (
                        <motion.div
                          key={mode}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-1 px-2 py-0.5 bg-accent/20 text-accent rounded-full text-xs font-medium"
                        >
                          <Icon className="w-3 h-3" />
                          <span>{getModeLabel(mode)}</span>
                          <button
                            type="button"
                            onClick={() => removeMode(mode)}
                            className="hover:bg-accent/30 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

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
                      e.currentTarget.closest('form')?.requestSubmit()
                    }
                  }}
                />

                <div className="flex items-center gap-2">
                  {/*
                  // Search mode dropdown and icons commented out for now
                  <div className="relative" ref={dropdownRef}> ... </div>
                  <motion.button ... > <Mic className="size-4" /> </motion.button>
                  */}
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!query.trim() || isSubmitting}
                    className="bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg disabled:opacity-50 h-9 w-9 md:h-8 md:w-8 btn-interactive"
                    aria-label="Send"
                  >
                    {/* Use send icon with bluish accent */}
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
