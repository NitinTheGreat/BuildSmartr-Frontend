"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Sparkles, Mic, FileEdit, FolderOpen, File, Plus, MessageSquare, Pencil, Check, X, Trash2, HardHat, Ruler, FileText, ArrowLeft, Globe, Mail, Quote, ChevronDown } from "lucide-react"
import type { Project, ChatMessage, ProjectChat, SearchMode } from "@/types/project"
import { EditFilesModal } from "./EditFilesModal"
import { useProjects } from "@/contexts/ProjectContext"

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
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editName, setEditName] = useState(project.name)
  const [editDescription, setEditDescription] = useState(project.description)
  const [selectedModes, setSelectedModes] = useState<SearchMode[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { 
    currentChatId, 
    setCurrentChatId, 
    createChat, 
    addMessageToChat,
    updateChatTitle,
    deleteChat,
    updateProject 
  } = useProjects()

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

  const handleNewChat = () => {
    createChat(project.id)
  }

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId)
  }

  const handleBackToProject = () => {
    setCurrentChatId(null)
  }

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteChat(project.id, chatId)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    // If no current chat, create one
    let chatId = currentChatId
    if (!chatId) {
      const newChat = createChat(project.id, query.trim().slice(0, 50))
      chatId = newChat.id
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query.trim(),
      timestamp: new Date(),
      searchModes: selectedModes.length > 0 ? selectedModes : undefined,
    }

    addMessageToChat(project.id, chatId, userMessage)

    // Update chat title if it's the first message
    const chat = project.chats.find(c => c.id === chatId)
    if (chat && chat.messages.length === 0) {
      updateChatTitle(project.id, chatId, query.trim().slice(0, 50))
    }

    setQuery("")

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const modesText = selectedModes.length > 0 
        ? `Using ${selectedModes.join(', ')} mode(s), ` 
        : ''
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `${modesText}I understand you're asking about "${query.trim()}" in the context of your project "${project.name}". ${project.description ? `Based on your project description: "${project.description}"` : ''} ${project.files.length > 0 ? `I can see you have ${project.files.length} file(s) attached to this project.` : ''} How can I help you further?`,
        timestamp: new Date(),
      }
      addMessageToChat(project.id, chatId!, assistantMessage)
    }, 1000)
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
        
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
            <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackToProject}
                  className="p-2 hover:bg-[#3c3f45] rounded-lg transition-colors"
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
                className="bg-transparent border-border hover:bg-[#3c3f45] gap-2"
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
                </motion.div>
              ))}
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
                      {/* Search mode dropdown */}
                      <div className="relative" ref={dropdownRef}>
                        <motion.button
                          type="button"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className={`flex items-center gap-1 p-1.5 rounded-lg transition-colors ${
                            selectedModes.length > 0 
                              ? 'text-accent bg-accent/10' 
                              : 'text-muted-foreground hover:text-foreground hover:bg-[#3c3f45]'
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
                              className="absolute right-0 bottom-full mb-2 bg-[#2b2d31] border border-border rounded-xl shadow-xl py-2 min-w-[180px] z-[100]"
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
                                          : 'text-foreground hover:bg-[#3c3f45]'
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
                <button onClick={handleSaveName} className="p-2 hover:bg-[#3c3f45] rounded-lg">
                  <Check className="w-5 h-5 text-green-400" />
                </button>
                <button onClick={handleCancelEditName} className="p-2 hover:bg-[#3c3f45] rounded-lg">
                  <X className="w-5 h-5 text-red-400" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
                <button 
                  onClick={() => setIsEditingName(true)}
                  className="p-2 hover:bg-[#3c3f45] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
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
                <button onClick={handleCancelEditDescription} className="p-2 hover:bg-[#3c3f45] rounded-lg">
                  <X className="w-4 h-4 text-red-400" />
                </button>
                <button onClick={handleSaveDescription} className="p-2 hover:bg-[#3c3f45] rounded-lg">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditFilesModalOpen(true)}
              className="bg-transparent border-border hover:bg-[#3c3f45] gap-2"
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
                  className="flex items-center gap-2 px-3 py-2 bg-[#2b2d31] border border-border rounded-lg"
                >
                  {getCategoryIcon(file.category)}
                  <span className="text-sm text-foreground">{file.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-[#2b2d31] border border-dashed border-border rounded-lg">
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
              className="bg-transparent border-border hover:bg-[#3c3f45] gap-2"
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
                  className="flex items-center justify-between p-3 bg-[#2b2d31] border border-border rounded-lg cursor-pointer hover:bg-[#3c3f45] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{chat.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {chat.messages.length} message{chat.messages.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    className="p-2 hover:bg-[#4a4d52] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
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
                      className="bg-accent hover:bg-accent-strong text-background rounded-lg disabled:opacity-50"
                      aria-label="Submit"
                    >
                      <Sparkles className="size-5" />
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
