"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { MarkdownRenderer } from "@/components/MarkdownRenderer"
import { Sparkles, Mic, FileEdit, FolderOpen, File, Plus, MessageSquare, Pencil, Check, X, Trash2, HardHat, Ruler, FileText, ArrowLeft, Globe, Mail, Quote, ChevronDown, Share2, Eye, Paperclip, MoreVertical, Ban, Loader2 } from "lucide-react"
import type { Project, ChatMessage, ProjectChat, SearchMode, ProjectFile } from "@/types/project"
import { EditFilesModal } from "./EditFilesModal"
import { ShareProjectModal } from "./ShareProjectModal"
import { PDFPreviewModal } from "./PDFPreviewModal"
import { useProjects } from "@/contexts/ProjectContext"
import { useIndexing } from "@/contexts/IndexingContext"
import { useStreamingSearch } from "@/hooks/useStreamingSearch"
import { useRouter } from "next/navigation"

interface SearchModeOption {
  id: SearchMode
  label: string
  icon: React.ElementType
  exclusive?: boolean
}

const searchModeOptions: SearchModeOption[] = [
  { id: 'web', label: 'Web Search', icon: Globe },
  { id: 'email', label: 'Email Search', icon: Mail },
  { id: 'quotes', label: 'Quotes', icon: Quote },
  { id: 'pdf', label: 'PDF Search', icon: FileText, exclusive: true },
]

interface ProjectChatInterfaceProps {
  project: Project
}

export function ProjectChatInterface({ project }: ProjectChatInterfaceProps) {
  const [query, setQuery] = useState("")
  const [isEditFilesModalOpen, setIsEditFilesModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editName, setEditName] = useState(project.name)
  const [editDescription, setEditDescription] = useState(project.description)
  const [selectedModes, setSelectedModes] = useState<SearchMode[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  // Optimistic message - shown immediately when user sends
  const [optimisticMessage, setOptimisticMessage] = useState<{ content: string; searchModes?: SearchMode[] } | null>(null)
  // Message queue - messages waiting to be processed
  const [messageQueue, setMessageQueue] = useState<{ content: string; searchModes?: SearchMode[] }[]>([])
  // Track if we're currently processing a message
  const [isProcessing, setIsProcessing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const {
    currentChatId,
    setCurrentChatId,
    loadChatMessages,
    createChat,
    addMessageToChat,
    updateChatTitle,
    deleteChat,
    updateProject,
    deleteProject
  } = useProjects()

  const { indexingStates, cancelIndexing, dismissIndexing } = useIndexing()
  const projectIndexingState = indexingStates[project.id]
  const indexingStats = projectIndexingState?.stats

  // Streaming search hook
  const {
    isStreaming,
    thinkingStatus,
    streamedContent,
    error: streamingError,
    stats: streamingStats,
    streamSearch,
    reset: resetStreaming,
  } = useStreamingSearch()

  const currentChat = project.chats.find(c => c.id === currentChatId)
  const messages = currentChat?.messages || []
  const isInChatView = !!currentChat

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

  // Focus name input when editing
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [isEditingName])

  // Focus description input when editing
  useEffect(() => {
    if (isEditingDescription && descriptionInputRef.current) {
      descriptionInputRef.current.focus()
      descriptionInputRef.current.select()
    }
  }, [isEditingDescription])

  // Update edit values when project changes
  useEffect(() => {
    setEditName(project.name)
    setEditDescription(project.description)
  }, [project.name, project.description])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleModeToggle = (mode: SearchMode) => {
    const option = searchModeOptions.find(o => o.id === mode)

    if (option?.exclusive) {
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

  const getModeIcon = (mode: SearchMode) => {
    const option = searchModeOptions.find(o => o.id === mode)
    return option?.icon || Globe
  }

  const getModeLabel = (mode: SearchMode) => {
    const option = searchModeOptions.find(o => o.id === mode)
    return option?.label || mode
  }

  const handleSaveName = () => {
    if (editName.trim()) {
      updateProject(project.id, { name: editName.trim() })
    } else {
      setEditName(project.name)
    }
    setIsEditingName(false)
  }

  const handleSaveDescription = () => {
    updateProject(project.id, { description: editDescription.trim() })
    setIsEditingDescription(false)
  }

  const handleCancelEditName = () => {
    setEditName(project.name)
    setIsEditingName(false)
  }

  const handleCancelEditDescription = () => {
    setEditDescription(project.description)
    setIsEditingDescription(false)
  }

  const handleNewChat = async () => {
    await createChat(project.id)
  }

  const handleSelectChat = async (chatId: string) => {
    setCurrentChatId(chatId)
    // Load messages for the selected chat
    await loadChatMessages(project.id, chatId)
  }

  const handleBackToProject = () => {
    setCurrentChatId(null)
  }

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteChat(project.id, chatId)
  }

  // Handle delete project
  const handleDeleteProject = async () => {
    setIsDeleting(true)
    try {
      // Cancel any active indexing first
      if (indexingStates[project.id]) {
        dismissIndexing(project.id)
      }
      await deleteProject(project.id)
      router.push('/')
    } catch (error) {
      console.error('Failed to delete project:', error)
    } finally {
      setIsDeleting(false)
      setDeleteConfirm(false)
    }
  }

  // Handle cancel sync
  const handleCancelSync = async () => {
    setIsSettingsOpen(false)
    await cancelIndexing(project.id)
  }

  // Process a single message - handles backend communication
  const processMessage = async (messageContent: string, modes: SearchMode[]) => {
    setIsProcessing(true)
    resetStreaming()

    try {
      // If no current chat, create one in background
      let chatId = currentChatId
      if (!chatId) {
        // Need to wait for chat creation so we can use the ID
        try {
          const newChat = await createChat(project.id, messageContent.slice(0, 50))
          chatId = newChat.id
        } catch (err) {
          console.error('Failed to create chat:', err)
          setIsProcessing(false)
          setOptimisticMessage(null)
          return
        }
      }

      const userMessage = {
        role: 'user' as const,
        content: messageContent,
        searchModes: modes.length > 0 ? modes : undefined,
      }

      // Save user message to backend (fire and forget for speed)
      addMessageToChat(project.id, chatId, userMessage).catch(console.error)

      // Update chat title if it's the first message
      const chat = project.chats.find(c => c.id === chatId)
      if (chat && chat.messages.length === 0) {
        updateChatTitle(project.id, chatId, messageContent.slice(0, 50)).catch(console.error)
      }

      // DON'T clear optimistic message - let it stay visible until AI response starts
      // setOptimisticMessage(null) -- removed for better UX

      // Use streaming search API
      try {
        // Clear optimistic message just before we start getting AI response
        setOptimisticMessage(null)

        // Check if project has been indexed - use database status (persists across sessions)
        // OR check active indexing state (for current session)
        const hasBeenIndexed =
          project.indexingStatus === 'completed' ||  // Database status (persists)
          project.aiProjectId ||                      // Has AI project ID in DB
          projectIndexingState?.status === 'completed' // Active session completed

        if (!hasBeenIndexed) {
          const errorMessage = {
            role: 'assistant' as const,
            content: 'This project hasn\'t been indexed yet. Please index your emails first to enable AI search.',
          }
          addMessageToChat(project.id, chatId!, errorMessage).catch(console.error)
          return
        }

        // Use project.id (Supabase UUID) - the Database Backend will handle the ai_project_id mapping
        const aiResponse = await streamSearch(project.id, messageContent)

        if (aiResponse) {
          const assistantMessage = {
            role: 'assistant' as const,
            content: aiResponse,
          }
          addMessageToChat(project.id, chatId!, assistantMessage).catch(console.error)
          resetStreaming()
        }
      } catch (streamError) {
        console.error('Streaming search error:', streamError)
        const errorMessage = {
          role: 'assistant' as const,
          content: `Sorry, I encountered an error while searching: ${streamError instanceof Error ? streamError.message : 'Unknown error'}. Please try again.`,
        }
        addMessageToChat(project.id, chatId!, errorMessage).catch(console.error)
        resetStreaming()
      }
    } catch (error) {
      console.error('Failed to process message:', error)
    } finally {
      setIsProcessing(false)
      setOptimisticMessage(null)
      // Process next message in queue if any
      setMessageQueue(prev => {
        if (prev.length > 0) {
          const [next, ...rest] = prev
          // Process next message immediately
          requestAnimationFrame(() => {
            setOptimisticMessage(next)
            processMessage(next.content, next.searchModes || [])
          })
          return rest
        }
        return prev
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    const messageContent = query.trim()
    const modes = [...selectedModes]

    // Use requestAnimationFrame for absolutely instant UI update
    requestAnimationFrame(() => {
      // Clear input IMMEDIATELY for snappy feel
      setQuery("")

      // If already processing, add to queue
      if (isProcessing || isStreaming) {
        setMessageQueue(prev => [...prev, { content: messageContent, searchModes: modes.length > 0 ? modes : undefined }])
        return
      }

      // Show message optimistically IMMEDIATELY
      setOptimisticMessage({ content: messageContent, searchModes: modes.length > 0 ? modes : undefined })

      // Process in background (non-blocking)
      processMessage(messageContent, modes)
    })
  }


  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'construction':
        return <HardHat className="w-4 h-4 text-orange-400" />
      case 'architectural':
        return <Ruler className="w-4 h-4 text-blue-400" />
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />
    }
  }

  const handleFileClick = (file: ProjectFile) => {
    // Open preview for PDFs and images
    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    const isImage = file.type.startsWith("image/")
    if ((isPDF || isImage) && file.url) {
      setPreviewFile(file)
    }
  }

  const isPreviewable = (file: ProjectFile) => {
    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    const isImage = file.type.startsWith("image/")
    return (isPDF || isImage) && file.url
  }

  // Chat view - when a chat is selected
  if (isInChatView) {
    return (
      <>
        <EditFilesModal
          isOpen={isEditFilesModalOpen}
          onClose={() => setIsEditFilesModalOpen(false)}
          projectId={project.id}
          currentFiles={project.files}
        />
        <ShareProjectModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          projectId={project.id}
          projectName={project.name}
        />
        <PDFPreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          file={previewFile}
        />

        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
            <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackToProject}
                  className="p-2 hover:bg-[#1e293b] rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </button>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-accent" />
                  <h1 className="font-semibold text-foreground">{currentChat.title}</h1>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditFilesModalOpen(true)}
                className="bg-transparent border-border hover:bg-[#1e293b] gap-2"
              >
                <FileEdit className="w-4 h-4" />
                Edit Files
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
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
                    {/* Show search modes if present */}
                    {message.searchModes && message.searchModes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {message.searchModes.map(mode => {
                          const Icon = getModeIcon(mode)
                          return (
                            <span
                              key={mode}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${message.role === 'user'
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
                    {message.role === 'assistant' ? (
                      <MarkdownRenderer content={message.content} />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Optimistic message - shown immediately when user sends (but not if already in messages) */}
              {optimisticMessage && !messages.some(m => m.role === 'user' && m.content === optimisticMessage.content) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-end"
                >
                  <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-accent text-background rounded-br-md">
                    {optimisticMessage.searchModes && optimisticMessage.searchModes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {optimisticMessage.searchModes.map(mode => {
                          const Icon = getModeIcon(mode)
                          return (
                            <span
                              key={mode}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-background/20 text-background"
                            >
                              <Icon className="w-2.5 h-2.5" />
                              {getModeLabel(mode)}
                            </span>
                          )
                        })}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{optimisticMessage.content}</p>
                  </div>
                </motion.div>
              )}

              {/* Queued messages - shown as subtle compact list */}
              {messageQueue.length > 0 && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] space-y-2">
                    <div className="text-xs text-muted-foreground text-right flex items-center justify-end gap-2">
                      <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                      {messageQueue.length} message{messageQueue.length !== 1 ? 's' : ''} queued
                    </div>
                    {messageQueue.map((queuedMsg, index) => (
                      <motion.div
                        key={`queued-${index}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 0.6, x: 0 }}
                        className="px-3 py-2 bg-accent/30 border border-accent/20 rounded-lg text-sm text-foreground/80 text-right"
                      >
                        <span className="line-clamp-1">{queuedMsg.content}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {(isStreaming || streamedContent) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-[#111827] text-foreground rounded-bl-md">
                    {/* Thinking status */}
                    {thinkingStatus && !streamedContent && (
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Spinner size="sm" variant="dots" />
                        <span>{thinkingStatus}</span>
                      </div>
                    )}

                    {/* Streamed content */}
                    {streamedContent && (
                      <div>
                        <MarkdownRenderer content={streamedContent} />
                        {isStreaming && (
                          <span className="inline-block w-2 h-4 ml-1 bg-accent animate-pulse" />
                        )}
                      </div>
                    )}

                    {/* Stats after completion */}
                    {streamingStats && !isStreaming && (
                      <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                        Search: {streamingStats.searchTimeMs}ms • LLM: {streamingStats.llmTimeMs}ms
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Streaming error */}
              {streamingError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 rounded-bl-md">
                    <p className="text-sm">⚠️ {streamingError}</p>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input at bottom */}
          <div className="sticky bottom-0 bg-background border-t border-border z-20 overflow-visible">
            <div className="max-w-3xl mx-auto px-4 py-4">
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
                          handleSubmit(e)
                        }
                      }}
                    />

                    <div className="flex items-center gap-2">
                      {/*
                      // Search mode dropdown, mic, and sparkles icons commented out
                      <div className="relative" ref={dropdownRef}>
                        <motion.button
                          type="button"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className={`flex items-center gap-1 p-1.5 rounded-lg transition-colors ${
                            selectedModes.length > 0 
                              ? 'text-accent bg-accent/10' 
                              : 'text-muted-foreground hover:text-foreground hover:bg-[#1e293b]'
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Globe className="w-4 h-4" />
                          <ChevronDown className={`w-2.5 h-2.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </motion.button>

                        <AnimatePresence>
                          {isDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute right-0 bottom-full mb-2 bg-[#111827] border border-border rounded-xl shadow-xl py-2 min-w-[180px] z-[100]"
                            >
                              {searchModeOptions.map((option) => {
                                const Icon = option.icon
                                const isSelected = selectedModes.includes(option.id)
                                const isDisabled = option.exclusive 
                                  ? selectedModes.length > 0 && !selectedModes.includes('pdf')
                                  : selectedModes.includes('pdf')
                                
                                return (
                                  <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => handleModeToggle(option.id)}
                                    disabled={isDisabled && !isSelected}
                                    className={`
                                      w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors
                                      ${isSelected 
                                        ? 'bg-accent/20 text-accent' 
                                        : isDisabled 
                                          ? 'text-muted-foreground/50 cursor-not-allowed'
                                          : 'text-foreground hover:bg-[#1e293b]'
                                      }
                                    `}
                                  >
                                    <Icon className={`w-4 h-4 ${isSelected ? 'text-accent' : ''}`} />
                                    <span className="flex-1 text-left">{option.label}</span>
                                    {isSelected && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-2 h-2 rounded-full bg-accent"
                                      />
                                    )}
                                  </button>
                                )
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <motion.button
                        type="button"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        aria-label="Voice input"
                      >
                        <Mic className="size-5" />
                      </motion.button>

                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          type="submit"
                          size="icon"
                          disabled={!query.trim()}
                          className="bg-accent hover:bg-accent-strong text-background rounded-lg disabled:opacity-50 h-8 w-8"
                          aria-label="Submit"
                        >
                          <Sparkles className="size-4" />
                        </Button>
                      </motion.div>
                      */}
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!query.trim() || isStreaming}
                        className="bg-accent hover:bg-accent-strong text-background rounded-lg disabled:opacity-50 h-8 w-8 transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer"
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
        </div>
      </>
    )
  }

  // Project overview - centered view (original style)
  return (
    <>
      <EditFilesModal
        isOpen={isEditFilesModalOpen}
        onClose={() => setIsEditFilesModalOpen(false)}
        projectId={project.id}
        currentFiles={project.files}
      />
      <ShareProjectModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        projectId={project.id}
        projectName={project.name}
      />
      <PDFPreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />

      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        {/* Project Header - Editable */}
        <div className="mb-8 text-center">
          {/* Project Name */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <FolderOpen className="w-8 h-8 text-accent" />
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') handleCancelEditName()
                  }}
                  className="bg-[#1f2121] border border-border rounded-lg px-3 py-2 text-2xl font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button onClick={handleSaveName} className="p-2 hover:bg-[#1e293b] rounded-lg">
                  <Check className="w-5 h-5 text-green-400" />
                </button>
                <button onClick={handleCancelEditName} className="p-2 hover:bg-[#1e293b] rounded-lg">
                  <X className="w-5 h-5 text-red-400" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-2 hover:bg-[#1e293b] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
                {/* Settings Menu */}
                <div className="relative" ref={settingsRef}>
                  <button
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    className="p-2 hover:bg-[#1e293b] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <AnimatePresence>
                    {isSettingsOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 top-full mt-1 bg-[#0d1117] border border-border rounded-lg shadow-xl py-1 min-w-[160px] z-50"
                      >
                        {/* Show cancel sync option if project is indexing */}
                        {(projectIndexingState?.status === 'indexing' ||
                          projectIndexingState?.status === 'vectorizing') && (
                            <button
                              onClick={handleCancelSync}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-400 hover:bg-[#1e293b] transition-colors"
                            >
                              <Ban className="w-4 h-4" />
                              Cancel Sync
                            </button>
                          )}
                        <button
                          onClick={() => {
                            setIsSettingsOpen(false)
                            setDeleteConfirm(true)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-[#1e293b] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Project
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {/* SHARE FEATURE DISABLED
                <button 
                  onClick={() => setIsShareModalOpen(true)}
                  className="p-2 hover:bg-[#1e293b] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Share project"
                >
                  <Share2 className="w-4 h-4 text-muted-foreground" />
                </button>
                */}
              </div>
            )}
          </div>

          {/* Project Description */}
          {isEditingDescription ? (
            <div className="max-w-lg mx-auto space-y-2">
              <textarea
                ref={descriptionInputRef}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') handleCancelEditDescription()
                }}
                rows={3}
                className="w-full bg-[#1f2121] border border-border rounded-lg px-3 py-2 text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                placeholder="Add a description..."
              />
              <div className="flex justify-center gap-2">
                <button onClick={handleCancelEditDescription} className="p-2 hover:bg-[#1e293b] rounded-lg">
                  <X className="w-4 h-4 text-red-400" />
                </button>
                <button onClick={handleSaveDescription} className="p-2 hover:bg-[#1e293b] rounded-lg">
                  <Check className="w-4 h-4 text-green-400" />
                </button>
              </div>
            </div>
          ) : (
            <div
              className="group cursor-pointer max-w-lg mx-auto"
              onClick={() => setIsEditingDescription(true)}
            >
              {project.description ? (
                <p className="text-muted-foreground group-hover:text-foreground transition-colors">
                  {project.description}
                  <Pencil className="w-3 h-3 inline-block ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              ) : (
                <p className="text-muted-foreground/50 italic group-hover:text-muted-foreground transition-colors">
                  Click to add description...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Files Section */}
        <div className="w-full max-w-2xl mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">
              Project Files ({project.files.length})
            </span>
            <div className="flex items-center gap-2">
              {/* SHARE FEATURE DISABLED
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsShareModalOpen(true)}
                className="bg-transparent border-border hover:bg-[#1e293b] gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditFilesModalOpen(true)}
                className="bg-transparent border-border hover:bg-[#1e293b] gap-2"
              >
                <FileEdit className="w-4 h-4" />
                Edit Files
              </Button>
            </div>
          </div>

          {project.files.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {project.files.map(file => (
                <div
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  className={`flex items-center gap-2 px-3 py-2 bg-[#111827] border border-border rounded-lg ${isPreviewable(file)
                    ? 'cursor-pointer hover:bg-[#1e293b] hover:border-accent/50 transition-colors'
                    : ''
                    }`}
                  title={isPreviewable(file) ? 'Click to preview' : undefined}
                >
                  {getCategoryIcon(file.category)}
                  <span className="text-sm text-foreground">{file.name}</span>
                  {isPreviewable(file) && (
                    <Eye className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-[#111827] border border-dashed border-border rounded-lg">
              <p className="text-sm text-muted-foreground">No files added yet</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditFilesModalOpen(true)}
                className="mt-2 text-accent hover:text-accent-strong"
              >
                Add files
              </Button>
            </div>
          )}
        </div>

        {/* Email Data Section */}
        {indexingStats && (indexingStats.thread_count > 0 || indexingStats.message_count > 0 || indexingStats.pdf_count > 0) && (
          <div className="w-full max-w-2xl mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">
                Indexed Email Data
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#111827] border border-border rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <MessageSquare className="w-5 h-5 text-accent" />
                </div>
                <p className="text-xl font-semibold text-foreground">{indexingStats.thread_count || 0}</p>
                <p className="text-xs text-muted-foreground">Conversations</p>
              </div>
              <div className="bg-[#111827] border border-border rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Mail className="w-5 h-5 text-accent" />
                </div>
                <p className="text-xl font-semibold text-foreground">{indexingStats.message_count || 0}</p>
                <p className="text-xs text-muted-foreground">Messages</p>
              </div>
              <div className="bg-[#111827] border border-border rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Paperclip className="w-5 h-5 text-accent" />
                </div>
                <p className="text-xl font-semibold text-foreground">{indexingStats.pdf_count || 0}</p>
                <p className="text-xs text-muted-foreground">Attachments</p>
              </div>
            </div>
          </div>
        )}

        {/* Chats Section */}
        <div className="w-full max-w-2xl mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">
              Chats ({project.chats.length})
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewChat}
              className="bg-transparent border-border hover:bg-[#1e293b] gap-2"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </Button>
          </div>

          {project.chats.length > 0 ? (
            <div className="space-y-2">
              {project.chats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => handleSelectChat(chat.id)}
                  className="flex items-center justify-between p-3 bg-[#111827] border border-border rounded-lg cursor-pointer hover:bg-[#1e293b] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{chat.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {chat.messageCount} message{chat.messageCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    className="p-2 hover:bg-[#334155] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Search/Chat Input */}
        <div className="w-full max-w-2xl">
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative bg-surface rounded-xl border border-border shadow-sm hover:border-muted transition-colors overflow-visible">
              <div className="flex items-start gap-3 p-4">
                <textarea
                  ref={textareaRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Ask anything about ${project.name}...`}
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[40px] max-h-[200px] py-2"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                />

                <div className="flex items-center gap-2 pt-2">
                  {/*
                  // Mic and other icons commented out for now
                  <motion.button ... > <Mic className="size-5" /> </motion.button>
                  */}
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!query.trim() || isStreaming}
                    className="bg-accent hover:bg-accent-strong text-background rounded-lg disabled:opacity-50 transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer"
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[100]"
              onClick={() => !isDeleting && setDeleteConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-[#111827] border border-border rounded-xl shadow-2xl z-[101] p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Delete Project</h3>
                  <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete <span className="text-foreground font-medium">&quot;{project.name}&quot;</span>?
                All project data, chats, and files will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-foreground bg-transparent border border-border rounded-lg hover:bg-[#1e293b] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProject}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
