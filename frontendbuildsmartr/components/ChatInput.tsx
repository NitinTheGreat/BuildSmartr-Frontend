"use client"

import type React from "react"
import { useRef, useEffect } from "react"
import { AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type { SearchMode } from "@/types/project"
import { getModeIcon, getModeLabel } from "@/lib/constants"

interface ChatInputProps {
  /** Current query value */
  query: string
  /** Callback when query changes */
  onQueryChange: (value: string) => void
  /** Callback when form is submitted */
  onSubmit: (e: React.FormEvent) => void
  /** Currently selected search modes */
  selectedModes?: SearchMode[]
  /** Callback to remove a search mode */
  onModeRemove?: (mode: SearchMode) => void
  /** Whether the form is currently submitting */
  isSubmitting?: boolean
  /** Whether streaming is in progress */
  isStreaming?: boolean
  /** Placeholder text for the textarea */
  placeholder?: string
  /** Additional class names */
  className?: string
}

/**
 * Reusable chat input component with mode chips and auto-expanding textarea
 */
export function ChatInput({
  query,
  onQueryChange,
  onSubmit,
  selectedModes = [],
  onModeRemove,
  isSubmitting = false,
  isStreaming = false,
  placeholder = "Message...",
  className = "",
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-expand textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      // Use proper form submission instead of type casting
      const form = e.currentTarget.closest('form')
      form?.requestSubmit()
    }
  }

  const isDisabled = !query.trim() || isSubmitting || isStreaming

  return (
    <form onSubmit={onSubmit} className={`relative ${className}`}>
      <div className="relative bg-surface rounded-xl border border-border shadow-sm hover:border-muted transition-colors overflow-visible">
        {/* Selected modes chips */}
        <AnimatePresence>
          {selectedModes.length > 0 && onModeRemove && (
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
                      onClick={() => onModeRemove(mode)}
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
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[24px] max-h-[200px] py-1"
            rows={1}
            onKeyDown={handleKeyDown}
          />

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              size="icon"
              disabled={isDisabled}
              className="bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg disabled:opacity-50 h-9 w-9 md:h-8 md:w-8 btn-interactive"
              aria-label="Send"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={2} 
                stroke="currentColor" 
                className="w-5 h-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 20l16-8-16-8v6l12 2-12 2v6z" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
