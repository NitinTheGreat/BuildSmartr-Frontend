"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Sparkles, Mic, Globe, Mail, Quote, FileText, ChevronDown, X, MessageSquare } from "lucide-react"
import { useProjects } from "@/contexts/ProjectContext"
import type { SearchMode } from "@/types/project"
import { SearchInterface } from "./SearchInterface"

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

export function GeneralChatInterface() {
  const [query, setQuery] = useState("")
  const [selectedModes, setSelectedModes] = useState<SearchMode[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { 
    generalChats,
    currentGeneralChatId,
    createGeneralChat,
    addMessageToGeneralChat,
    updateGeneralChatTitle,
  } = useProjects()

  const currentChat = generalChats.find(c => c.id === currentGeneralChatId)
  const messages = currentChat?.messages || []

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

  // If no current chat, show the welcome screen with SearchInterface
  if (!currentChat) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        {/* Logo */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold tracking-tight">
            <span className="text-foreground">IIvy</span>
          </h1>
        </div>

        {/* Search Interface */}
        <SearchInterface />
      </main>
    )
  }

  // Chat view with messages
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-accent" />
          <h1 className="font-semibold text-foreground">{currentChat.title}</h1>
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
                    <Mic className="size-4" />
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
  )
}
