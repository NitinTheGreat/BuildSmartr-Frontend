"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Sparkles, Globe, Mail, Quote, FileText, Mic, ChevronDown, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useProjects } from "@/contexts/ProjectContext"
import type { SearchMode, ChatMessage } from "@/types/project"

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

export function SearchInterface() {
  const [query, setQuery] = useState("")
  const [selectedModes, setSelectedModes] = useState<SearchMode[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { createGeneralChat, addMessageToGeneralChat, updateGeneralChatTitle } = useProjects()

  // Auto-expand textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [query])

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
      // If PDF is selected, clear all others and only select PDF
      if (selectedModes.includes(mode)) {
        setSelectedModes([])
      } else {
        setSelectedModes([mode])
      }
    } else {
      // If selecting a non-exclusive mode, remove PDF if it's selected
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

    setIsSubmitting(true)
    try {
      const currentQuery = query.trim()
      
      // Create a new general chat
      const chat = await createGeneralChat(currentQuery.slice(0, 50))

      // Add the user message
      const userMessage = {
        role: 'user' as const,
        content: currentQuery,
        searchModes: selectedModes.length > 0 ? selectedModes : undefined,
      }
      await addMessageToGeneralChat(chat.id, userMessage)
      await updateGeneralChatTitle(chat.id, currentQuery.slice(0, 50))

      // Simulate AI response
      setTimeout(async () => {
        const modesText = selectedModes.length > 0 
          ? `Using ${selectedModes.join(', ')} mode(s), ` 
          : ''
        const assistantMessage = {
          role: 'assistant' as const,
          content: `${modesText}I understand you're asking about "${currentQuery}". How can I help you further?`,
        }
        await addMessageToGeneralChat(chat.id, assistantMessage)
      }, 1000)

      // Navigate to chat page
      router.push('/chat')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getModeIcon = (mode: SearchMode) => {
    const option = searchModeOptions.find(o => o.id === mode)
    return option?.icon || Globe
  }

  const getModeLabel = (mode: SearchMode) => {
    const option = searchModeOptions.find(o => o.id === mode)
    return option?.label || mode
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative bg-surface rounded-xl border border-border shadow-sm hover:border-muted transition-colors overflow-visible">
          {/* Selected modes chips */}
          <AnimatePresence>
            {selectedModes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 pt-3 flex flex-wrap gap-2"
              >
                {selectedModes.map(mode => {
                  const Icon = getModeIcon(mode)
                  return (
                    <motion.div
                      key={mode}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-accent/20 text-accent rounded-full text-xs font-medium"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{getModeLabel(mode)}</span>
                      <button
                        type="button"
                        onClick={() => removeMode(mode)}
                        className="hover:bg-accent/30 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-start gap-3 p-4">
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything regarding your construction queries."
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[40px] max-h-[400px] py-2"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />

            <div className="flex items-center gap-2 mt-2">
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
                  <Globe className="w-5 h-5" />
                  <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
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
                              w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
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
  )
}
