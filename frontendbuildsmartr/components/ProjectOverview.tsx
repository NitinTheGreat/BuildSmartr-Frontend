"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { 
  FolderOpen, Plus, MessageSquare, Pencil, Check, X, Trash2, 
  HardHat, Ruler, FileText, Eye, MoreVertical, Loader2, FileEdit, 
  Quote, Search, Mail, DollarSign, Clock, ChevronRight
} from "lucide-react"
import type { Project, ProjectFile, ProjectAddress, QuoteRequest } from "@/types/project"
import { EditFilesModal } from "./EditFilesModal"
import { PDFPreviewModal } from "./PDFPreviewModal"
import { QuotePanel } from "./QuotePanel"

import { useProjects } from "@/contexts/ProjectContext"
import { useSendMessage } from "@/hooks/useSendMessage"
import { useChatMessages } from "@/hooks/useChatMessages"
import { useRouter } from "next/navigation"

interface ProjectOverviewProps {
  project: Project
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
  refreshProjects: () => Promise<void>
}

/**
 * ProjectOverview - Shows project details, files, and chat list.
 * When user asks a question, it creates a new chat and switches to ChatView.
 */
export function ProjectOverview({ 
  project, 
  onSelectChat, 
  onNewChat,
  refreshProjects 
}: ProjectOverviewProps) {
  const [isEditFilesModalOpen, setIsEditFilesModalOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editName, setEditName] = useState(project.name)
  const [editDescription, setEditDescription] = useState(project.description)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [isQuotePanelOpen, setIsQuotePanelOpen] = useState(false)
  const [quoteHistory, setQuoteHistory] = useState<QuoteRequest[]>([])
  const [quoteHistoryLoading, setQuoteHistoryLoading] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null)
  const [selectedQuoteLoading, setSelectedQuoteLoading] = useState(false)
  
  const nameInputRef = useRef<HTMLInputElement>(null)
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const { updateProject, deleteProject, createChat, setCurrentChatId } = useProjects()

  // Build project address from project data
  const projectAddress: ProjectAddress = {
    street: project.addressStreet,
    city: project.addressCity,
    region: project.addressRegion,
    country: project.addressCountry || 'CA',
    postal: project.addressPostal,
  }
  
  // Address editing state
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [editAddress, setEditAddress] = useState<ProjectAddress>({
    street: project.addressStreet || '',
    city: project.addressCity || '',
    region: project.addressRegion || '',
    country: project.addressCountry || 'CA',
    postal: project.addressPostal || '',
  })

  // Use the new send message hook for sending from overview
  // When we send a message here, it will create a chat and we'll switch to ChatView
  const { addMessage } = useChatMessages(null) // No chat selected yet
  const {
    send,
    isSending,
    pendingUserContent,
    showAssistantPlaceholder,
    isStreaming,
  } = useSendMessage({
    projectId: project.id,
    chatId: null, // New chat will be created
    onChatCreated: (chatId) => {
      // When a new chat is created, switch to it
      setCurrentChatId(chatId)
    },
    addMessage,
    refreshProjects,
  })

  // Auto-expand textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [inputValue])

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
    setEditAddress({
      street: project.addressStreet || '',
      city: project.addressCity || '',
      region: project.addressRegion || '',
      country: project.addressCountry || 'CA',
      postal: project.addressPostal || '',
    })
  }, [project.name, project.description, project.addressStreet, project.addressCity, project.addressRegion, project.addressCountry, project.addressPostal])

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch quote history for this project
  useEffect(() => {
    async function fetchQuoteHistory() {
      setQuoteHistoryLoading(true)
      try {
        const res = await fetch(`/api/projects/${project.id}/quotes`)
        if (res.ok) {
          const data = await res.json()
          setQuoteHistory(Array.isArray(data) ? data : (data.data || []))
        }
      } catch (err) {
        console.error('Failed to fetch quote history:', err)
      } finally {
        setQuoteHistoryLoading(false)
      }
    }
    fetchQuoteHistory()
  }, [project.id])

  // Fetch full quote details when clicked
  const handleViewQuote = async (quoteId: string) => {
    setSelectedQuoteLoading(true)
    try {
      const res = await fetch(`/api/quotes/${quoteId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedQuote(data.data || data)
      }
    } catch (err) {
      console.error('Failed to fetch quote details:', err)
    } finally {
      setSelectedQuoteLoading(false)
    }
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

  const handleSaveAddress = async () => {
    await updateProject(project.id, {
      addressStreet: editAddress.street || undefined,
      addressCity: editAddress.city || undefined,
      addressRegion: editAddress.region || undefined,
      addressCountry: editAddress.country || undefined,
      addressPostal: editAddress.postal || undefined,
    })
    await refreshProjects()
    setIsEditingAddress(false)
  }

  const handleCancelEditAddress = () => {
    setEditAddress({
      street: project.addressStreet || '',
      city: project.addressCity || '',
      region: project.addressRegion || '',
      country: project.addressCountry || 'CA',
      postal: project.addressPostal || '',
    })
    setIsEditingAddress(false)
  }

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

  const handleNewChat = async () => {
    const chat = await createChat(project.id)
    onSelectChat(chat.id)
  }

  // Handler to create a new chat and add quote results
  const handleAddQuoteToNewChat = async (question: string, answer: string) => {
    try {
      // Create a new chat for the quote
      const chat = await createChat(project.id)
      
      // Add the user message (quote request)
      const userRes = await fetch(`/api/chats/${chat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'user',
          content: question,
          search_modes: ['quotes'],
        }),
      })
      
      if (!userRes.ok) {
        console.error('Failed to save user message:', await userRes.text())
        return
      }
      
      // Add the assistant message (quote results)
      const assistantRes = await fetch(`/api/chats/${chat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'assistant',
          content: answer,
        }),
      })
      
      if (!assistantRes.ok) {
        console.error('Failed to save assistant message:', await assistantRes.text())
        return
      }
      
      // Wait for DB to fully commit both messages
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Navigate to the chat FIRST, then refresh projects in background
      // This prevents the refreshProjects from causing state changes during navigation
      onSelectChat(chat.id)
      
      // Refresh projects in background (don't await)
      refreshProjects().catch(console.error)
    } catch (err) {
      console.error('Failed to create quote chat:', err)
    }
  }

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`/api/chats/${chatId}`, { method: 'DELETE' })
      await refreshProjects()
    } catch (error) {
      console.error('Failed to delete chat:', error)
    }
  }

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isSending) return

    const content = inputValue.trim()
    setInputValue("")
    send(content)
  }, [inputValue, isSending, send])

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

  // If sending (creating a new chat), show a loading state
  if (isSending || pendingUserContent || showAssistantPlaceholder || isStreaming) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Starting chat...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <EditFilesModal
        isOpen={isEditFilesModalOpen}
        onClose={() => setIsEditFilesModalOpen(false)}
        projectId={project.id}
        currentFiles={project.files}
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
        onAddQuoteMessage={handleAddQuoteToNewChat}
      />

      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        {/* Project Header */}
        <div className="mb-8 text-center">
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
              </div>
            )}
          </div>

          {/* Description */}
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

        {/* Project Address Section - Required for Quotes */}
        <div className="w-full max-w-2xl mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              Project Location
              {(!project.addressRegion || !project.addressCountry) && (
                <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                  Required for Quotes
                </span>
              )}
            </span>
            {!isEditingAddress && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingAddress(true)}
                className="bg-transparent border-border hover:bg-[#1e293b] gap-2"
              >
                <Pencil className="w-4 h-4" />
                Edit Location
              </Button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {isEditingAddress ? (
              <motion.div
                key="editing"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#111827] border border-border rounded-lg p-4 space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Street Address</label>
                    <input
                      type="text"
                      value={editAddress.street || ''}
                      onChange={(e) => setEditAddress(prev => ({ ...prev, street: e.target.value }))}
                      placeholder="123 Main Street"
                      className="w-full bg-[#1f2121] border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">City</label>
                    <input
                      type="text"
                      value={editAddress.city || ''}
                      onChange={(e) => setEditAddress(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Toronto"
                      className="w-full bg-[#1f2121] border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Region/Province <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={editAddress.region || ''}
                      onChange={(e) => setEditAddress(prev => ({ ...prev, region: e.target.value }))}
                      placeholder="Ontario"
                      className="w-full bg-[#1f2121] border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Country <span className="text-amber-400">*</span>
                    </label>
                    <select
                      value={editAddress.country || 'CA'}
                      onChange={(e) => setEditAddress(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full bg-[#1f2121] border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="CA">Canada</option>
                      <option value="US">United States</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Postal Code</label>
                    <input
                      type="text"
                      value={editAddress.postal || ''}
                      onChange={(e) => setEditAddress(prev => ({ ...prev, postal: e.target.value }))}
                      placeholder="M5V 3L9"
                      className="w-full bg-[#1f2121] border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleCancelEditAddress}
                    className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-[#1e293b] rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAddress}
                    disabled={!editAddress.region || !editAddress.country}
                    className="px-4 py-2 text-sm text-background bg-accent hover:bg-accent-strong rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Location
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="display"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[#111827] border border-border rounded-lg p-4"
              >
                {project.addressRegion || project.addressCity ? (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>
                      {[
                        project.addressStreet,
                        project.addressCity,
                        project.addressRegion,
                        project.addressCountry === 'CA' ? 'Canada' : project.addressCountry === 'US' ? 'United States' : project.addressCountry,
                        project.addressPostal,
                      ].filter(Boolean).join(', ')}
                    </span>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-sm text-muted-foreground/50 italic">
                      No location set - click Edit Location to add one
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Files Section */}
        <div className="w-full max-w-2xl mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">
              Project Files ({project.files.length})
            </span>
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

          {project.files.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {project.files.map(file => (
                <div
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  className={`flex items-center gap-2 px-3 py-2 bg-[#111827] border border-border rounded-lg ${
                    isPreviewable(file)
                      ? 'cursor-pointer hover:bg-[#1e293b] hover:border-accent/50 transition-colors'
                      : ''
                  }`}
                >
                  {getCategoryIcon(file.category)}
                  <span className="text-sm text-foreground">{file.name}</span>
                  {isPreviewable(file) && <Eye className="w-3 h-3 text-muted-foreground" />}
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

        {/* Quote History Section */}
        <div className="w-full max-w-2xl mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <Quote className="w-4 h-4 text-accent" />
              Quote History ({quoteHistory.length})
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQuotePanelOpen(true)}
              className="bg-transparent border-border hover:bg-[#1e293b] gap-2"
            >
              <Plus className="w-4 h-4" />
              New Quote
            </Button>
          </div>

          {quoteHistoryLoading ? (
            <div className="flex items-center justify-center py-8 bg-[#111827] border border-border rounded-lg">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading quotes...</span>
            </div>
          ) : quoteHistory.length === 0 ? (
            <div className="text-center py-8 bg-[#111827] border border-dashed border-border rounded-lg">
              <DollarSign className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                No quotes requested yet for this project.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsQuotePanelOpen(true)}
                className="text-accent hover:text-accent-strong"
              >
                Request Your First Quote
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {quoteHistory.map(quote => (
                <button
                  key={quote.id}
                  onClick={() => handleViewQuote(quote.id)}
                  className="w-full p-4 bg-[#111827] border border-border rounded-lg hover:border-accent/30 hover:bg-[#1e293b] transition-colors text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">
                          {quote.segment_name || quote.segment}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          quote.status === 'completed' 
                            ? 'bg-green-500/20 text-green-400' 
                            : quote.status === 'failed'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {quote.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Ruler className="w-3 h-3" />
                          {quote.project_sqft?.toLocaleString()} sqft
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(quote.created_at).toLocaleDateString()}
                        </span>
                        {quote.vendor_quotes?.length > 0 && (
                          <span className="text-accent">
                            {quote.vendor_quotes.length} vendor{quote.vendor_quotes.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {quote.benchmark_range?.low && quote.benchmark_range?.high && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Benchmark: ${quote.benchmark_range.low.toLocaleString()} - ${quote.benchmark_range.high.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
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

          {project.chats.length > 0 && (
            <div className="space-y-2">
              {project.chats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className="flex items-center justify-between p-3 bg-[#111827] border border-border rounded-lg cursor-pointer hover:bg-[#1e293b] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{chat.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(chat.updatedAt).toLocaleDateString()}
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
          )}
        </div>

        {/* Chat Input with Search Mode Options */}
        <div className="w-full max-w-2xl">
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative bg-surface rounded-xl border border-border shadow-sm hover:border-muted transition-colors overflow-visible">
              <div className="flex items-start gap-3 p-4 pb-2">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
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
                <Button
                  type="submit"
                  size="icon"
                  disabled={!inputValue.trim() || isSending}
                  className="bg-accent hover:bg-accent-strong text-background rounded-lg disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 20l16-8-16-8v6l12 2-12 2v6z" />
                  </svg>
                </Button>
              </div>
              
              {/* Search Mode Options */}
              <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-border/30">
                <div className="flex items-center gap-2">
                  {/* Search Active Indicator */}
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-xs font-medium">
                    <Search className="w-3 h-3" />
                    Search
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  {/* Quotes Button */}
                  <button
                    type="button"
                    onClick={() => setIsQuotePanelOpen(true)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
                    title="Get Quotes"
                  >
                    <Quote className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            <p className="text-[11px] text-muted-foreground/40 text-center mt-3 tracking-wide">
              Enter to send · Shift+Enter for new line
            </p>
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
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-foreground bg-transparent border border-border rounded-lg hover:bg-[#1e293b] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProject}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

      {/* Quote Details Modal */}
      <AnimatePresence>
        {(selectedQuote || selectedQuoteLoading) && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              onClick={() => !selectedQuoteLoading && setSelectedQuote(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#111827] border border-border rounded-2xl shadow-2xl z-[101]"
            >
              {selectedQuoteLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  <span className="ml-3 text-muted-foreground">Loading quote details...</span>
                </div>
              ) : selectedQuote && (
                <>
                  {/* Header */}
                  <div className="sticky top-0 bg-[#111827] border-b border-border p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                        <Quote className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">
                          {selectedQuote.segment_name || selectedQuote.segment}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {selectedQuote.project_sqft?.toLocaleString()} sqft · {new Date(selectedQuote.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedQuote(null)}
                      className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* IIVY Benchmark */}
                    {selectedQuote.iivy_benchmark && (
                      <div className="p-5 bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 rounded-xl">
                        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-accent" />
                          IIVY Benchmark
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-surface/50 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Per sqft</p>
                            <p className="text-lg font-semibold text-foreground">
                              ${selectedQuote.iivy_benchmark.range_per_sf?.low?.toFixed(2)} - ${selectedQuote.iivy_benchmark.range_per_sf?.high?.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-center p-3 bg-surface/50 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Total Estimate</p>
                            <p className="text-lg font-semibold text-accent">
                              ${selectedQuote.iivy_benchmark.range_total?.low?.toLocaleString()} - ${selectedQuote.iivy_benchmark.range_total?.high?.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Vendor Quotes */}
                    <div>
                      <h3 className="font-semibold text-foreground mb-3">
                        Vendor Quotes ({selectedQuote.vendor_quotes?.length || 0})
                      </h3>
                      {selectedQuote.vendor_quotes && selectedQuote.vendor_quotes.length > 0 ? (
                        <div className="space-y-3">
                          {selectedQuote.vendor_quotes.map((vq, index) => (
                            <div key={index} className="p-4 border border-border rounded-xl bg-surface/50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-foreground">{vq.company_name}</span>
                                <span className="text-lg font-semibold text-accent">
                                  ${vq.total?.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>${vq.final_rate_per_sf?.toFixed(2)}/sf</span>
                                {vq.lead_time && <span>Lead time: {vq.lead_time}</span>}
                              </div>
                              {vq.company_description && (
                                <p className="text-sm text-muted-foreground mt-2 italic">
                                  {vq.company_description}
                                </p>
                              )}
                              <div className="mt-3 pt-3 border-t border-border/50">
                                <a
                                  href={`mailto:${vq.contact_email || vq.user_email}?subject=Quote Request - ${selectedQuote.segment_name || selectedQuote.segment}`}
                                  className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
                                >
                                  <Mail className="w-4 h-4" />
                                  {vq.contact_email || vq.user_email}
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 border border-dashed border-border rounded-xl">
                          <p className="text-muted-foreground">No vendor quotes available for this request</p>
                        </div>
                      )}
                    </div>

                    {/* Close Button */}
                    <button
                      onClick={() => setSelectedQuote(null)}
                      className="w-full px-4 py-3 bg-accent text-background font-medium rounded-xl hover:bg-accent/90 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
