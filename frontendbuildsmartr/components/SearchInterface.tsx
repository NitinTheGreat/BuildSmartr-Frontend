"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Search, Sparkles, Globe, FileText, Mic } from "lucide-react"

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
        <div className="relative bg-surface rounded-xl border border-muted shadow-card overflow-hidden">
          <div className="flex items-start gap-3 p-4">
            <button
              type="button"
              className="mt-2 text-muted-foreground hover:text-accent transition-colors"
              aria-label="Search"
            >
              <Search className="size-5" />
            </button>

            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything. Type @ for mentions and / for shortcuts."
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
              <button
                type="button"
                className="text-muted-foreground hover:text-accent transition-colors"
                aria-label="Add image"
              >
                <FileText className="size-5" />
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-accent transition-colors"
                aria-label="Voice input"
              >
                <Mic className="size-5" />
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-accent transition-colors"
                aria-label="Attach file"
              >
                <Globe className="size-5" />
              </button>
              <Button
                type="submit"
                size="icon"
                className="bg-accent hover:bg-accent-strong text-background rounded-lg"
                aria-label="Submit"
              >
                <Sparkles className="size-5" />
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Quick action buttons */}
      <div className="flex flex-wrap gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full bg-surface hover:bg-muted border-muted text-foreground"
        >
          <Search className="size-4 mr-2" />
          Research
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full bg-surface hover:bg-muted border-muted text-foreground"
        >
          <Sparkles className="size-4 mr-2" />
          Teach me
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full bg-surface hover:bg-muted border-muted text-foreground"
        >
          <FileText className="size-4 mr-2" />
          Get a job
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full bg-surface hover:bg-muted border-muted text-foreground"
        >
          <Globe className="size-4 mr-2" />
          Ivvy 101
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full bg-surface hover:bg-muted border-muted text-foreground"
        >
          <Sparkles className="size-4 mr-2" />
          Health
        </Button>
      </div>
    </div>
  )
}
