"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Sparkles, ArrowLeft, FileText, ChevronDown, 
  Loader2, Search, Clock, User, Copy, X, AlertTriangle,
  Globe, Quote, Mail
} from "lucide-react"
import type { Project, ChatMessage, MessageSource, SearchMode, ProjectAddress } from "@/types/project"
import type { SourceItem } from "@/types/streaming"
import { MarkdownRenderer } from "@/components/MarkdownRenderer"
import { useChatMessages } from "@/hooks/useChatMessages"
import { useSendMessage } from "@/hooks/useSendMessage"
import { QuotePanel } from "./QuotePanel"

// ============================================
// Sub-components
// ============================================

/** Collapsible sources for historical messages */
function HistoricalSources({ sources, messageId }: { sources: MessageSource[], messageId: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedSourceIndex, setExpandedSourceIndex] = useState<number | null>(null)

  return (
    <div className="mt-6 pt-4 border-t border-border/30">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <FileText className="w-4 h-4" />
        <span className="font-medium">Sources ({sources.length})</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex gap-3 overflow-x-auto pb-2 pt-4 scrollbar-hidden -mx-2 px-2">
              {sources.map((source, i) => (
                <button
                  key={`${messageId}-source-${i}`}
                  onClick={() => setExpandedSourceIndex(expandedSourceIndex === i ? null : i)}
                  className="group flex-shrink-0 w-[240px] text-left p-3 bg-surface/30 hover:bg-surface/50 border border-border/30 hover:border-border/50 rounded-lg transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center justify-center w-5 h-5 bg-accent/10 text-accent text-[10px] font-bold rounded">
                      {i + 1}
                    </span>
                    <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${
                      source.chunk_type === 'email_body'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-purple-500/10 text-purple-400'
                    }`}>
                      {source.chunk_type === 'email_body' ? 'Email' : 'PDF'}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground line-clamp-1 mb-1">
                    {source.subject || 'Untitled'}
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {source.text}
                  </p>
                  <AnimatePresence>
                    {expandedSourceIndex === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 pt-2 border-t border-border/30 overflow-hidden"
                      >
                        <p className="text-[11px] text-foreground/80 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                          {source.text}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                          {source.sender && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {source.sender}
                            </span>
                          )}
                          {source.timestamp && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {source.timestamp}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Streaming sources display */
function StreamingSources({ sources }: { sources: SourceItem[] }) {
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set())
  const [showAll, setShowAll] = useState(false)

  const toggleExpanded = (index: number) => {
    setExpandedSources(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  if (sources.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-sm font-semibold text-foreground tracking-wide uppercase">
            Sources
          </span>
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            {sources.length}
          </span>
        </div>
        {sources.length > 4 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-accent hover:text-accent/80 transition-colors font-medium"
          >
            {showAll ? 'Show less' : `View all ${sources.length}`}
          </button>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hidden -mx-2 px-2">
        {(showAll ? sources : sources.slice(0, 6)).map((source, i) => (
          <motion.button
            key={source.chunk_id || i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => toggleExpanded(i)}
            className="group flex-shrink-0 w-[260px] text-left p-4 bg-surface/50 hover:bg-surface border border-border/40 hover:border-border rounded-xl transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center justify-center w-6 h-6 bg-accent/10 text-accent text-xs font-bold rounded-md">
                {i + 1}
              </span>
              <span className={`px-2 py-1 text-[10px] font-medium rounded-md ${
                source.chunk_type === 'email_body'
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'bg-purple-500/10 text-purple-400'
              }`}>
                {source.chunk_type === 'email_body' ? 'Email' : 'PDF'}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground line-clamp-1 mb-2">
              {source.subject || 'Untitled'}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
              {source.text}
            </p>
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
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

interface ChatViewProps {
  project: Project
  chatId: string | null
  onChatIdChange: (chatId: string | null) => void
  onBack: () => void
  refreshProjects: () => Promise<void>
}

/**
 * ChatView - The main chat interface component.
 * 
 * Uses the new durable-first architecture:
 * - Messages fetched on-demand via useChatMessages
 * - Send flow managed by useSendMessage
 * - Instant pending UI with database-first saves
 */
export function ChatView({ 
  project, 
  chatId, 
  onChatIdChange, 
  onBack,
  refreshProjects 
}: ChatViewProps) {
  // Input state
  const [inputValue, setInputValue] = useState("")
  const [selectedModes, setSelectedModes] = useState<SearchMode[]>([])
  const [isQuotePanelOpen, setIsQuotePanelOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Build project address from project data
  const projectAddress: ProjectAddress = {
    street: project.addressStreet,
    city: project.addressCity,
    region: project.addressRegion,
    country: project.addressCountry || 'CA',
    postal: project.addressPostal,
  }

  const handleModeToggle = (mode: SearchMode) => {
    if (mode === 'quotes') {
      setIsQuotePanelOpen(true)
      return
    }
    
    if (selectedModes.includes(mode)) {
      setSelectedModes(prev => prev.filter(m => m !== mode))
    } else {
      setSelectedModes(prev => [...prev, mode])
    }
  }

  // Fetch messages for this chat
  const {
    messages,
    isLoading: messagesLoading,
    error: messagesError,
    addMessage,
  } = useChatMessages(chatId)

  // Handler to add quote results as a chat message (Q&A style)
  const handleAddQuoteMessage = useCallback(async (question: string, answer: string) => {
    if (!chatId) return
    
    try {
      // First, add a user message with the quote request details
      const userResponse = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'user',
          content: question,
          search_modes: ['quotes'],
        }),
      })
      
      if (userResponse.ok) {
        const savedUserMessage = await userResponse.json()
        addMessage({
          id: savedUserMessage.id,
          role: 'user',
          content: question,
          timestamp: new Date(savedUserMessage.timestamp),
          searchModes: ['quotes'],
        })
      }
      
      // Then add the assistant response with the quote results
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'assistant',
          content: answer,
        }),
      })
      
      if (response.ok) {
        const savedMessage = await response.json()
        addMessage({
          id: savedMessage.id,
          role: 'assistant',
          content: answer,
          timestamp: new Date(savedMessage.timestamp),
        })
      }
    } catch (err) {
      console.error('Failed to save quote message:', err)
    }
  }, [chatId, addMessage])

  // Send message flow
  const {
    send,
    isSending,
    pendingUserContent,
    showAssistantPlaceholder,
    isStreaming,
    streamedContent,
    streamedSources,
    thinkingStatus,
    error: sendError,
    saveError,
    copyStreamedContent,
    clearError,
  } = useSendMessage({
    projectId: project.id,
    chatId,
    onChatCreated: onChatIdChange,
    addMessage,
    refreshProjects,
  })

  // Get current chat metadata
  const currentChat = project.chats.find(c => c.id === chatId)

  // Auto-expand textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [inputValue])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamedContent, pendingUserContent])

  // Handle submit
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isSending) return

    const content = inputValue.trim()
    setInputValue("")
    send(content)
  }, [inputValue, isSending, send])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2.5 hover:bg-muted/40 rounded-xl transition-all duration-200 group"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
            <div className="border-l border-border/50 pl-4">
              <h1 className="text-sm font-semibold text-foreground line-clamp-1">
                {currentChat?.title || 'New Chat'}
              </h1>
              <p className="text-xs text-muted-foreground/70 mt-0.5">{project.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
          {/* Loading state */}
          {messagesLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading messages...</span>
            </div>
          )}

          {/* Messages error */}
          {messagesError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-sm text-red-400">{messagesError}</p>
            </div>
          )}

          {/* Messages from database */}
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
              className="w-full"
            >
              {message.role === 'user' ? (
                <div className="mb-2">
                  <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-tight tracking-tight">
                    {message.content}
                  </h2>
                </div>
              ) : (
                <div className="mt-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ring-1 ring-accent/20">
                      <Sparkles className="w-4 h-4 text-accent" />
                    </div>
                    <span className="text-sm font-semibold text-foreground tracking-wide uppercase">Answer</span>
                  </div>
                  <div className="prose prose-invert prose-lg max-w-none 
                    prose-headings:font-semibold prose-headings:tracking-tight
                    prose-p:text-[15px] prose-p:leading-relaxed prose-p:text-foreground/90
                    prose-li:text-[15px] prose-li:leading-relaxed
                    prose-strong:text-foreground prose-strong:font-semibold">
                    <MarkdownRenderer content={message.content} />
                  </div>
                  {message.sources && message.sources.length > 0 && (
                    <HistoricalSources sources={message.sources} messageId={message.id} />
                  )}
                </div>
              )}
            </motion.div>
          ))}

          {/* Pending user message (sending...) */}
          {pendingUserContent && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <div className="mb-2 flex items-start gap-3">
                <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-tight tracking-tight opacity-70">
                  {pendingUserContent}
                </h2>
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground flex-shrink-0 mt-1" />
              </div>
            </motion.div>
          )}

          {/* Assistant placeholder / Streaming response */}
          {(showAssistantPlaceholder || isStreaming || streamedContent) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full mt-6"
            >
              <div className="space-y-6">
                {/* Thinking status (before streaming starts) */}
                {(thinkingStatus || (showAssistantPlaceholder && !streamedContent)) && (
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
                      <span className="text-sm text-foreground/80">
                        {thinkingStatus || 'Searching...'}
                      </span>
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

                {/* Streaming sources */}
                {streamedSources.length > 0 && (
                  <StreamingSources sources={streamedSources} />
                )}

                {/* Streaming content */}
                {streamedContent && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ring-1 ring-accent/20">
                        <Sparkles className="w-4 h-4 text-accent" />
                      </div>
                      <span className="text-sm font-semibold text-foreground tracking-wide uppercase">Answer</span>
                    </div>
                    <div className="prose prose-invert prose-lg max-w-none 
                      prose-headings:font-semibold prose-headings:tracking-tight
                      prose-p:text-[15px] prose-p:leading-relaxed prose-p:text-foreground/90
                      prose-li:text-[15px] prose-li:leading-relaxed
                      prose-strong:text-foreground prose-strong:font-semibold">
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
              </div>
            </motion.div>
          )}

          {/* Send error with copy button */}
          {sendError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <div className={`p-4 rounded-xl border ${
                saveError 
                  ? 'bg-amber-500/10 border-amber-500/20' 
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                    saveError ? 'text-amber-400' : 'text-red-400'
                  }`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      saveError ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {sendError}
                    </p>
                    {saveError && (
                      <button
                        onClick={copyStreamedContent}
                        className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Response
                      </button>
                    )}
                  </div>
                  <button
                    onClick={clearError}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 z-20">
        <div className="bg-gradient-to-t from-background via-background/95 to-transparent pt-6 pb-6">
          <div className="max-w-4xl mx-auto px-6">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative bg-surface/80 backdrop-blur-xl rounded-2xl border border-border/60 shadow-2xl shadow-black/20 hover:border-border focus-within:border-accent/40 focus-within:ring-1 focus-within:ring-accent/20 transition-all duration-300">
                <div className="flex items-end gap-3 p-4 pb-2">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={chatId ? "Ask a follow-up question..." : `Ask anything about ${project.name}...`}
                    className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/50 resize-none outline-none min-h-[28px] max-h-[140px] py-1 text-[15px] leading-relaxed"
                    rows={1}
                    disabled={isSending}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSubmit(e)
                      }
                    }}
                  />

                  <motion.button
                    type="submit"
                    disabled={!inputValue.trim() || isSending}
                    className="w-10 h-10 rounded-xl bg-accent hover:bg-accent-strong text-background flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-accent/20"
                    whileHover={{ scale: inputValue.trim() && !isSending ? 1.02 : 1 }}
                    whileTap={{ scale: inputValue.trim() && !isSending ? 0.98 : 1 }}
                    aria-label="Send"
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                      </svg>
                    )}
                  </motion.button>
                </div>
                
                {/* Search Mode Options */}
                <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-border/30">
                  <div className="flex items-center gap-2">
                    {/* Search Active Indicator */}
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-xs font-medium">
                      <Mail className="w-3 h-3" />
                      Email
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
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

              <p className="text-[11px] text-muted-foreground/40 text-center mt-3 tracking-wide">
                Enter to send · Shift+Enter for new line
              </p>
            </form>
          </div>
        </div>
      </div>
      
      {/* Quote Panel Modal */}
      <QuotePanel
        isOpen={isQuotePanelOpen}
        onClose={() => setIsQuotePanelOpen(false)}
        projectId={project.id}
        projectName={project.name}
        projectAddress={projectAddress}
        chatId={chatId || undefined}
        onAddQuoteMessage={chatId ? handleAddQuoteMessage : undefined}
      />
    </div>
  )
}
