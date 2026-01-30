"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { MarkdownRenderer } from "@/components/MarkdownRenderer"
import { Sparkles, Mic, FileEdit, FolderOpen, File, Plus, MessageSquare, Pencil, Check, X, Trash2, HardHat, Ruler, FileText, ArrowLeft, Globe, Mail, Quote, ChevronDown, Share2, Eye, Paperclip, MoreVertical, Ban, Loader2, Search, ExternalLink, Clock, User } from "lucide-react"
import type { Project, ChatMessage, ProjectChat, SearchMode, ProjectFile, ProjectAddress } from "@/types/project"
import type { SourceItem } from "@/types/streaming"
import { EditFilesModal } from "./EditFilesModal"
import { ShareProjectModal } from "./ShareProjectModal"
import { PDFPreviewModal } from "./PDFPreviewModal"
import { QuotePanel } from "./QuotePanel"
import { useProjects } from "@/contexts/ProjectContext"
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
  const [isQuotePanelOpen, setIsQuotePanelOpen] = useState(false)
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

  // Streaming search hook
  const {
    isStreaming,
    thinkingStatus,
    sources: streamingSources,
    streamedContent,
    error: streamingError,
    stats: streamingStats,
    streamSearch,
    reset: resetStreaming,
  } = useStreamingSearch()

  // Track expanded sources for Perplexity-style UI
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set())
  const [showAllSources, setShowAllSources] = useState(false)

  const toggleSourceExpanded = useCallback((index: number) => {
    setExpandedSources(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const currentChat = project.chats.find(c => c.id === currentChatId)
  const messages = currentChat?.messages || []
  // Use currentChatId to determine chat view (not currentChat) - handles case where chat was just created
  const isInChatView = !!currentChatId

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
    // Special handling for quotes mode - open the quote panel
    if (mode === 'quotes') {
      setIsQuotePanelOpen(true)
      return
    }

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

  // Build project address from project data
  const projectAddress: ProjectAddress = {
    street: (project as any).address_street,
    city: (project as any).address_city,
    region: (project as any).address_region,
    country: (project as any).address_country || 'CA',
    postal: (project as any).address_postal,
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
      await deleteProject(project.id)
      router.push('/')
    } catch (error) {
      console.error('Failed to delete project:', error)
    } finally {
      setIsDeleting(false)
      setDeleteConfirm(false)
    }
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

      // Use streaming search API with conversation context
      try {
        // Clear optimistic message just before we start getting AI response
        setOptimisticMessage(null)

        // Check if project has been indexed - use database status (persists across sessions)
        const hasBeenIndexed =
          project.indexingStatus === 'completed' ||  // Database status (persists)
          project.aiProjectId                        // Has AI project ID in DB

        if (!hasBeenIndexed) {
          const errorMessage = {
            role: 'assistant' as const,
            content: 'This project hasn\'t been indexed yet. Please index your emails first to enable AI search.',
          }
          addMessageToChat(project.id, chatId!, errorMessage).catch(console.error)
          return
        }

        // NEW: Use chatId for conversation-aware search
        // The hook fetches conversation context (summary + recent messages) automatically
        const aiResponse = await streamSearch(chatId!, messageContent)

        if (aiResponse && aiResponse.content) {
          // Build sources for the assistant message (enhanced with rewrite info for debugging)
          const sources = aiResponse.sources?.length > 0 ? {
            retrieved: aiResponse.sources.map(s => ({
              chunk_id: s.chunk_id,
              file_id: s.file_id,
              score: s.score,
              page: s.page
            })),
            cited: aiResponse.sources.slice(0, 3).map(s => ({
              chunk_id: s.chunk_id,
              file_id: s.file_id,
              page: s.page
            })),
            rewrite: aiResponse.rewriteInfo ? {
              original: aiResponse.rewriteInfo.original,
              standalone: aiResponse.rewriteInfo.standalone
            } : undefined
          } : undefined

          const assistantMessage = {
            role: 'assistant' as const,
            content: aiResponse.content,
            sources,
          }
          addMessageToChat(project.id, chatId!, assistantMessage).catch(console.error)
          
          // Trigger summary update in background if needed (every ~8 messages)
          // This is fire-and-forget - doesn't block the UI
          fetch(`/api/chats/${chatId}/summary`, { method: 'POST' }).catch(() => {
            // Silently ignore - summary updates are best-effort
          })
          
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
        <QuotePanel
          isOpen={isQuotePanelOpen}
          onClose={() => setIsQuotePanelOpen(false)}
          projectId={project.id}
          projectName={project.name}
          projectAddress={projectAddress}
          chatId={currentChatId || undefined}
        />

        <div className="min-h-screen flex flex-col bg-background">
          {/* Header - Clean & Minimal */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/30">
            <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBackToProject}
                  className="p-2.5 hover:bg-muted/40 rounded-xl transition-all duration-200 group"
                >
                  <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
                <div className="border-l border-border/50 pl-4">
                  <h1 className="text-sm font-semibold text-foreground line-clamp-1">{currentChat?.title || 'New Chat'}</h1>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{project.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditFilesModalOpen(true)}
                className="p-2.5 hover:bg-muted/40 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground"
              >
                <FileEdit className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages - Professional Clean Style */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.02 }}
                  className="w-full"
                >
                  {message.role === 'user' ? (
                    /* User Question - Full width, prominent */
                    <div className="mb-2">
                      <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-tight tracking-tight">
                        {message.content}
                      </h2>
                    </div>
                  ) : (
                    /* Assistant Answer - Clean, readable */
                    <div className="mt-6">
                      {/* Answer Header */}
                      <div className="flex items-center gap-2.5 mb-5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ring-1 ring-accent/20">
                          <Sparkles className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-sm font-semibold text-foreground tracking-wide uppercase">Answer</span>
                      </div>
                      {/* Answer Content - Better typography */}
                      <div className="prose prose-invert prose-lg max-w-none 
                        prose-headings:font-semibold prose-headings:tracking-tight
                        prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                        prose-p:text-[15px] prose-p:leading-relaxed prose-p:text-foreground/90
                        prose-li:text-[15px] prose-li:leading-relaxed prose-li:text-foreground/90
                        prose-strong:text-foreground prose-strong:font-semibold
                        prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                        prose-code:text-accent prose-code:bg-accent/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                        prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-border/50
                        prose-blockquote:border-l-accent prose-blockquote:bg-accent/5 prose-blockquote:py-1 prose-blockquote:not-italic">
                        <MarkdownRenderer content={message.content} />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Optimistic message - shown immediately when user sends (but not if already in messages) */}
              {optimisticMessage && !messages.some(m => m.role === 'user' && m.content === optimisticMessage.content) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-2"
                >
                  <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-tight tracking-tight">
                    {optimisticMessage.content}
                  </h2>
                </motion.div>
              )}

              {/* Queued messages - subtle indicator */}
              {messageQueue.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 py-3 px-4 bg-amber-500/5 border border-amber-500/20 rounded-xl"
                >
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <span className="text-sm text-amber-400/90">
                    {messageQueue.length} follow-up question{messageQueue.length !== 1 ? 's' : ''} queued
                  </span>
                </motion.div>
              )}

              {/* AI Response - Clean Professional Style */}
              {(isStreaming || streamedContent || streamingSources.length > 0 || thinkingStatus) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full mt-6"
                >
                  <div className="space-y-6">
                    {/* Thinking Status - Minimal & Elegant */}
                    {thinkingStatus && !streamedContent && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-4"
                      >
                        <div className="relative">
                          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                            <Search className="w-4 h-4 text-accent" />
                          </div>
                          <motion.div
                            className="absolute -inset-1 rounded-xl border border-accent/20"
                            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-foreground/80">{thinkingStatus}</span>
                          <div className="flex gap-1">
                            {[0, 1, 2].map(i => (
                              <motion.div
                                key={i}
                                className="w-1 h-1 bg-accent/60 rounded-full"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Sources Panel - Clean Horizontal List */}
                    {streamingSources.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-4"
                      >
                        {/* Sources Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                              <FileText className="w-4 h-4 text-blue-400" />
                            </div>
                            <span className="text-sm font-semibold text-foreground tracking-wide uppercase">
                              Sources
                            </span>
                            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                              {streamingSources.length}
                            </span>
                          </div>
                          {streamingSources.length > 4 && (
                            <button
                              onClick={() => setShowAllSources(!showAllSources)}
                              className="text-xs text-accent hover:text-accent/80 transition-colors font-medium"
                            >
                              {showAllSources ? 'Show less' : `View all ${streamingSources.length}`}
                            </button>
                          )}
                        </div>

                        {/* Sources - Horizontal Scroll */}
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hidden -mx-2 px-2">
                          {(showAllSources ? streamingSources : streamingSources.slice(0, 6)).map((source, i) => (
                            <motion.button
                              key={source.chunk_id || i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03 }}
                              onClick={() => toggleSourceExpanded(i)}
                              className="group flex-shrink-0 w-[260px] text-left p-4 bg-surface/50 hover:bg-surface border border-border/40 hover:border-border rounded-xl transition-all duration-200"
                            >
                              {/* Top row: Number + Type */}
                              <div className="flex items-center justify-between mb-3">
                                <span className="flex items-center justify-center w-6 h-6 bg-accent/10 text-accent text-xs font-bold rounded-md">
                                  {i + 1}
                                </span>
                                <span className={`px-2 py-1 text-[10px] font-medium rounded-md ${source.chunk_type === 'email_body'
                                  ? 'bg-blue-500/10 text-blue-400'
                                  : 'bg-purple-500/10 text-purple-400'
                                  }`}>
                                  {source.chunk_type === 'email_body' ? 'Email' : 'PDF'}
                                </span>
                              </div>

                              {/* Subject */}
                              <p className="text-sm font-medium text-foreground line-clamp-1 mb-2">
                                {source.subject || 'Untitled'}
                              </p>

                              {/* Preview */}
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                                {source.text}
                              </p>

                              {/* Metadata Footer */}
                              <div className="flex items-center gap-3 text-[11px] text-muted-foreground/80 pt-2 border-t border-border/30">
                                {source.sender && (
                                  <div className="flex items-center gap-1.5 truncate">
                                    <User className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{source.sender}</span>
                                  </div>
                                )}
                                {source.timestamp && (
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <Clock className="w-3 h-3" />
                                    <span>{source.timestamp}</span>
                                  </div>
                                )}
                              </div>

                              {/* Expanded Content */}
                              <AnimatePresence>
                                {expandedSources.has(i) && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mt-3 pt-3 border-t border-border/30 overflow-hidden"
                                  >
                                    <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">
                                      {source.text}
                                    </p>
                                    {source.score && (
                                      <div className="mt-3 flex items-center gap-2">
                                        <div className="h-1 flex-1 bg-muted/30 rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-accent/60 rounded-full"
                                            style={{ width: `${Math.round(source.score * 100)}%` }}
                                          />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground font-medium">
                                          {Math.round(source.score * 100)}%
                                        </span>
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Answer Section */}
                    {streamedContent && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.15 }}
                      >
                        {/* Answer Header */}
                        <div className="flex items-center gap-2.5 mb-5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ring-1 ring-accent/20">
                            <Sparkles className="w-4 h-4 text-accent" />
                          </div>
                          <span className="text-sm font-semibold text-foreground tracking-wide uppercase">Answer</span>
                        </div>
                        {/* Answer Content */}
                        <div className="prose prose-invert prose-lg max-w-none 
                          prose-headings:font-semibold prose-headings:tracking-tight
                          prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                          prose-p:text-[15px] prose-p:leading-relaxed prose-p:text-foreground/90
                          prose-li:text-[15px] prose-li:leading-relaxed prose-li:text-foreground/90
                          prose-strong:text-foreground prose-strong:font-semibold
                          prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                          prose-code:text-accent prose-code:bg-accent/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                          prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-border/50
                          prose-blockquote:border-l-accent prose-blockquote:bg-accent/5 prose-blockquote:py-1 prose-blockquote:not-italic">
                          <MarkdownRenderer content={streamedContent} />
                          {isStreaming && (
                            <motion.span
                              className="inline-block w-0.5 h-5 ml-0.5 bg-accent rounded-full"
                              animate={{ opacity: [1, 0.3, 1] }}
                              transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                            />
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Stats Footer - Minimal */}
                    {streamingStats && !isStreaming && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-6 pt-6 mt-6 border-t border-border/20"
                      >
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Search className="w-3.5 h-3.5 text-muted-foreground/60" />
                          <span className="font-medium">{streamingStats.searchTimeMs}ms</span>
                          <span className="text-muted-foreground/50">search</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Sparkles className="w-3.5 h-3.5 text-muted-foreground/60" />
                          <span className="font-medium">{streamingStats.llmTimeMs}ms</span>
                          <span className="text-muted-foreground/50">generation</span>
                        </div>
                        <div className="ml-auto text-xs text-muted-foreground/50">
                          Total: <span className="text-muted-foreground font-medium">{streamingStats.totalTimeMs}ms</span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Streaming error */}
              {streamingError && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full"
                >
                  <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                        <X className="w-5 h-5 text-red-400" />
                      </div>
                      <div className="pt-1">
                        <p className="text-sm font-semibold text-red-400 mb-1.5">Something went wrong</p>
                        <p className="text-sm text-red-400/70 leading-relaxed">{streamingError}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input - Clean, Floating Style */}
          <div className="sticky bottom-0 z-20">
            <div className="bg-gradient-to-t from-background via-background/95 to-transparent pt-6 pb-6">
              <div className="max-w-4xl mx-auto px-6">
                <form onSubmit={handleSubmit} className="relative">
                  <div className="relative bg-surface/80 backdrop-blur-xl rounded-2xl border border-border/60 shadow-2xl shadow-black/20 hover:border-border focus-within:border-accent/40 focus-within:ring-1 focus-within:ring-accent/20 transition-all duration-300">
                    {/* Textarea and Send */}
                    <div className="flex items-end gap-3 p-4 pb-2">
                      <textarea
                        ref={textareaRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ask a follow-up question..."
                        className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/50 resize-none outline-none min-h-[28px] max-h-[140px] py-1 text-[15px] leading-relaxed"
                        rows={1}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSubmit(e)
                          }
                        }}
                      />

                      <motion.button
                        type="submit"
                        disabled={!query.trim() || isStreaming}
                        className="w-10 h-10 rounded-xl bg-accent hover:bg-accent-strong text-background flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-accent/20"
                        whileHover={{ scale: query.trim() && !isStreaming ? 1.02 : 1 }}
                        whileTap={{ scale: query.trim() && !isStreaming ? 0.98 : 1 }}
                        aria-label="Send"
                      >
                        {isStreaming ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                          </svg>
                        )}
                      </motion.button>
                    </div>

                    {/* Action Chips - Bottom of Input */}
                    <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-border/20">
                      <div className="flex items-center gap-2">
                        {/* Search Active Indicator */}
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-xs font-medium">
                          <Mail className="w-3 h-3" />
                          Email
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {/* Web Search */}
                        <button
                          type="button"
                          onClick={() => handleModeToggle('web')}
                          className={`p-2 rounded-lg transition-colors ${
                            selectedModes.includes('web')
                              ? 'bg-accent/20 text-accent'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                          }`}
                          title="Web Search"
                        >
                          <Globe className="w-4 h-4" />
                        </button>
                        
                        {/* Quotes Button */}
                        <button
                          type="button"
                          onClick={() => setIsQuotePanelOpen(true)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
                          title="Get Quotes"
                        >
                          <Quote className="w-4 h-4" />
                        </button>
                        
                        {/* PDF Search */}
                        <button
                          type="button"
                          onClick={() => handleModeToggle('pdf')}
                          className={`p-2 rounded-lg transition-colors ${
                            selectedModes.includes('pdf')
                              ? 'bg-accent/20 text-accent'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                          }`}
                          title="PDF Search"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Hint */}
                  <p className="text-[11px] text-muted-foreground/40 text-center mt-3 tracking-wide">
                    Enter to send · Shift+Enter for new line
                  </p>
                </form>
              </div>
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
      <QuotePanel
        isOpen={isQuotePanelOpen}
        onClose={() => setIsQuotePanelOpen(false)}
        projectId={project.id}
        projectName={project.name}
        projectAddress={projectAddress}
        chatId={currentChatId || undefined}
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

        {/* Get Quotes Section */}
        <div className="w-full max-w-2xl mb-8">
          <div className="p-6 bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Quote className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Get Vendor Quotes</h3>
                  <p className="text-sm text-muted-foreground">Compare prices from vendors in your area</p>
                </div>
              </div>
              <Button
                onClick={() => setIsQuotePanelOpen(true)}
                className="bg-accent hover:bg-accent/90 text-background gap-2"
              >
                <Quote className="w-4 h-4" />
                Get Quotes
              </Button>
            </div>
          </div>
        </div>

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
              {/* Textarea and Send Button */}
              <div className="flex items-start gap-3 p-4 pb-2">
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

              {/* Action Chips - Perplexity Style */}
              <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-border/30">
                <div className="flex items-center gap-2">
                  {/* Search Mode Chip */}
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Search
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Web Search Toggle */}
                  <button
                    type="button"
                    onClick={() => handleModeToggle('web')}
                    className={`p-2 rounded-lg transition-colors ${
                      selectedModes.includes('web')
                        ? 'bg-accent/20 text-accent'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                    }`}
                    title="Web Search"
                  >
                    <Globe className="w-4 h-4" />
                  </button>
                  
                  {/* Quotes Button */}
                  <button
                    type="button"
                    onClick={() => setIsQuotePanelOpen(true)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
                    title="Get Quotes"
                  >
                    <Quote className="w-4 h-4" />
                  </button>
                  
                  {/* PDF Search Toggle */}
                  <button
                    type="button"
                    onClick={() => handleModeToggle('pdf')}
                    className={`p-2 rounded-lg transition-colors ${
                      selectedModes.includes('pdf')
                        ? 'bg-accent/20 text-accent'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                    }`}
                    title="PDF Search"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
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
