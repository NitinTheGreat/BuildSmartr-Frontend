"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
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
      <motion.main 
        className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 32px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)',
        }}
      >
        {/* Logo */}
        <motion.div 
          className="mb-8 md:mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            <span className="text-foreground">IIvy</span>
          </h1>
        </motion.div>

        {/* Search Interface */}
        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <SearchInterface />
        </motion.div>
      </motion.main>
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
                      handleSubmit(e)
                    }
                  }}
                />

                <div className="flex items-center gap-2">
                  {/*
                  // Search mode dropdown and icons commented out for now
                  <div className="relative" ref={dropdownRef}> ... </div>
                  <motion.button ... > <Mic className="size-4" /> </motion.button>
                  */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!query.trim() || isSubmitting}
                      className="bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg disabled:opacity-50 h-9 w-9 md:h-8 md:w-8 transition-all duration-200"
                      aria-label="Send"
                    >
                      {/* Use send icon with bluish accent */}
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20l16-8-16-8v6l12 2-12 2v6z" />
                      </svg>
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  )
}
