"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Search, Sparkles, Globe, FileText, Mic, ImageIcon } from "lucide-react"

const AnimatedIconButton = ({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType
  label: string
  onClick?: () => void
}) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground transition-colors"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      aria-label={label}
    >
      <Icon className="size-5" />
    </motion.button>
  )
}

export function SearchInterface() {
  const [query, setQuery] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-expand textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [query])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle search submission
    console.log("Search query:", query)
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative bg-surface rounded-xl border border-border shadow-sm overflow-hidden hover:border-muted transition-colors">
          <div className="flex items-center gap-3 p-4">
            <AnimatedIconButton icon={Search} label="Search" />

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
              <AnimatedIconButton icon={ImageIcon} label="Add image" />
              <AnimatedIconButton icon={Globe} label="Web search" />
              <AnimatedIconButton icon={FileText} label="Attach file" />
              <AnimatedIconButton icon={Mic} label="Voice input" />

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  type="submit"
                  size="icon"
                  className="bg-accent hover:bg-accent-strong text-background rounded-lg"
                  aria-label="Submit"
                >
                  <Sparkles className="size-5" />
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </form>

      <div className="flex flex-wrap gap-2 mt-4">
        {[
          { icon: Search, label: "Research" },
          { icon: Sparkles, label: "Teach me" },
          { icon: FileText, label: "Get a job" },
          { icon: Globe, label: "Ivvy 101" },
          { icon: Sparkles, label: "Health" },
        ].map((action, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              variant="outline"
              size="sm"
              className="rounded-full bg-surface hover:bg-muted border-border text-foreground"
            >
              <action.icon className="size-4 mr-2" />
              {action.label}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
