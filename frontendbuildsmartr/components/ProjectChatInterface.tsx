"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Sparkles, Mic, FileEdit, FolderOpen, File } from "lucide-react"
import type { Project, ChatMessage } from "@/types/project"
import { EditFilesModal } from "./EditFilesModal"

interface ProjectChatInterfaceProps {
  project: Project
}

export function ProjectChatInterface({ project }: ProjectChatInterfaceProps) {
  const [query, setQuery] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isEditFilesModalOpen, setIsEditFilesModalOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const hasStartedChat = messages.length > 0

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setQuery("")

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I understand you're asking about "${query.trim()}" in the context of your project "${project.name}". ${project.description ? `Based on your project description: "${project.description}"` : ''} ${project.files.length > 0 ? `I can see you have ${project.files.length} file(s) attached to this project.` : ''} How can I help you further?`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])
    }, 1000)
  }

  // Initial view - centered with project info
  if (!hasStartedChat) {
    return (
      <>
        <EditFilesModal
          isOpen={isEditFilesModalOpen}
          onClose={() => setIsEditFilesModalOpen(false)}
          projectId={project.id}
          currentFiles={project.files}
        />
        
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
          {/* Project Header */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <FolderOpen className="w-8 h-8 text-accent" />
              <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
            </div>
            {project.description && (
              <p className="text-muted-foreground max-w-lg">{project.description}</p>
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
                    <File className="w-4 h-4 text-muted-foreground" />
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

          {/* Search/Chat Input */}
          <div className="w-full max-w-2xl">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative bg-surface rounded-xl border border-border shadow-sm overflow-hidden hover:border-muted transition-colors">
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

  // Chat view - messages with input at bottom
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
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-accent" />
              <h1 className="font-semibold text-foreground">{project.name}</h1>
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
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input at bottom */}
        <div className="sticky bottom-0 bg-background border-t border-border">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative bg-surface rounded-xl border border-border shadow-sm overflow-hidden hover:border-muted transition-colors">
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
