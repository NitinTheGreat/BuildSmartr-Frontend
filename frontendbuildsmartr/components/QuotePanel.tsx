"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Quote, ChevronDown, Loader2, X, MapPin, Building2, Ruler, DollarSign, Copy, Check } from "lucide-react"
import type { SegmentsResponse, Segment, ProjectAddress, QuoteRequest } from "@/types/project"
import { QuoteResults } from "./QuoteResults"

interface QuotePanelProps {
  projectId: string
  projectName: string
  projectAddress?: ProjectAddress
  chatId?: string
  isOpen: boolean
  onClose: () => void
  onQuoteComplete?: (quote: QuoteRequest) => void
  /** Callback to add quote result as a chat message */
  onAddQuoteMessage?: (question: string, answer: string) => void | Promise<void>
}

/** Format the user question for a quote request */
function formatQuoteQuestion(
  segmentName: string, 
  sqft: number, 
  additionalRequirements?: string,
  address?: ProjectAddress
): string {
  const lines: string[] = []
  lines.push(`📊 Get a quote for **${segmentName}**`)
  lines.push('')
  lines.push(`- **Project Size:** ${sqft.toLocaleString()} sqft`)
  if (address?.city || address?.region) {
    lines.push(`- **Location:** ${[address.city, address.region, address.country].filter(Boolean).join(', ')}`)
  }
  if (additionalRequirements?.trim()) {
    lines.push(`- **Requirements:** ${additionalRequirements.trim()}`)
  }
  return lines.join('\n')
}

/** Format quote results as a markdown message for the chat */
function formatQuoteAsMarkdown(quote: QuoteRequest): string {
  const lines: string[] = []
  
  lines.push(`## 📊 Quote Results: ${quote.segment_name || quote.segment}`)
  lines.push(`**Project Size:** ${quote.project_sqft.toLocaleString()} sqft`)
  lines.push('')
  
  // IIVY Benchmark
  if (quote.iivy_benchmark) {
    const { range_per_sf, range_total } = quote.iivy_benchmark
    lines.push('### 💡 IIVY Benchmark')
    lines.push(`- **Per sqft:** $${range_per_sf.low.toFixed(2)} - $${range_per_sf.high.toFixed(2)}`)
    lines.push(`- **Total Estimate:** $${range_total.low.toLocaleString()} - $${range_total.high.toLocaleString()}`)
    lines.push('')
  }
  
  // Vendor Quotes
  if (quote.vendor_quotes && quote.vendor_quotes.length > 0) {
    lines.push(`### 🏢 Vendor Quotes (${quote.vendor_quotes.length} found)`)
    quote.vendor_quotes.forEach((vq, i) => {
      lines.push(`**${i + 1}. ${vq.company_name}**`)
      lines.push(`- Rate: $${vq.final_rate_per_sf.toFixed(2)}/sqft`)
      lines.push(`- Total: $${vq.total.toLocaleString()}`)
      if (vq.lead_time) lines.push(`- Lead Time: ${vq.lead_time}`)
      lines.push('')
    })
  } else {
    lines.push('### 🏢 Vendor Quotes')
    lines.push(`*No vendors currently serve your area for ${quote.segment_name || quote.segment}. Use the IIVY Benchmark above as a reference for expected pricing.*`)
    lines.push('')
  }
  
  return lines.join('\n')
}

export function QuotePanel({
  projectId,
  projectName,
  projectAddress,
  chatId,
  isOpen,
  onClose,
  onQuoteComplete,
  onAddQuoteMessage,
}: QuotePanelProps) {
  const [segments, setSegments] = useState<SegmentsResponse | null>(null)
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null)
  const [projectSqft, setProjectSqft] = useState("")
  const [additionalRequirements, setAdditionalRequirements] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingSegments, setLoadingSegments] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quoteResult, setQuoteResult] = useState<QuoteRequest | null>(null)

  // Fetch segments on mount
  useEffect(() => {
    async function fetchSegments() {
      try {
        const res = await fetch("/api/segments")
        if (res.ok) {
          const data = await res.json()
          setSegments(data.data || null)
        }
      } catch (err) {
        console.error("Failed to fetch segments:", err)
      } finally {
        setLoadingSegments(false)
      }
    }
    fetchSegments()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSegment || !projectSqft) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment: selectedSegment.id,
          project_sqft: parseInt(projectSqft),
          additional_requirements: additionalRequirements.trim() || undefined,
          chat_id: chatId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Handle validation errors with better messages
        if (res.status === 422) {
          const errorMsg = data.errors?.[0]?.message || data.message || data.error || "Validation failed"
          // Check for address-related errors
          if (errorMsg.toLowerCase().includes("region") || errorMsg.toLowerCase().includes("country") || errorMsg.toLowerCase().includes("address")) {
            throw new Error("Please add a project address (city, region) in project settings before requesting quotes.")
          }
          throw new Error(errorMsg)
        }
        throw new Error(data.message || data.error || "Failed to get quotes")
      }

      // Backend returns the quote directly, not wrapped in data
      onQuoteComplete?.(data)
      
      // If we have a callback to add the quote as a chat message, use it
      if (onAddQuoteMessage && selectedSegment) {
        const question = formatQuoteQuestion(
          selectedSegment.name,
          parseInt(projectSqft),
          additionalRequirements,
          projectAddress
        )
        const answer = formatQuoteAsMarkdown(data)
        // Await the callback to ensure messages are saved before navigation
        await onAddQuoteMessage(question, answer)
        onClose() // Close the panel since message is shown in chat
      } else {
        // No chat context - show results in the panel
        setQuoteResult(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get quotes")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedSegment(null)
    setProjectSqft("")
    setAdditionalRequirements("")
    setQuoteResult(null)
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  // Show results if we have them
  if (quoteResult) {
    return (
      <QuoteResults
        quote={quoteResult}
        onClose={handleClose}
        onNewQuote={resetForm}
      />
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="bg-surface border border-border rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        >
          {/* Header */}
          <div className="sticky top-0 bg-surface border-b border-border/50 p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Quote className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Get Quotes</h2>
                <p className="text-sm text-muted-foreground">{projectName}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Project Address Display or Warning */}
            {projectAddress && (projectAddress.city || projectAddress.region) ? (
              <div className="p-4 bg-muted/30 border border-border/50 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <MapPin className="w-4 h-4" />
                  Project Location
                </div>
                <p className="text-foreground">
                  {[projectAddress.city, projectAddress.region, projectAddress.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            ) : (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-amber-400 mb-2">
                  <MapPin className="w-4 h-4" />
                  Project Location Required
                </div>
                <p className="text-sm text-amber-400/80">
                  Please add a project address (city, region) to get vendor quotes. 
                  You can add this in the project settings.
                </p>
              </div>
            )}

            {/* Segment Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  Trade Segment *
                </span>
              </label>
              {loadingSegments ? (
                <div className="flex items-center gap-2 p-3 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading segments...
                </div>
              ) : (
                <select
                  required
                  value={selectedSegment?.id || ""}
                  onChange={e => {
                    const segId = e.target.value
                    const seg = segments?.phases
                      .flatMap(p => p.segments)
                      .find(s => s.id === segId)
                    setSelectedSegment(seg || null)
                  }}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                >
                  <option value="">Select a segment...</option>
                  {segments?.phases.map(phase => (
                    <optgroup key={phase.name} label={phase.name}>
                      {phase.segments.map(seg => (
                        <option key={seg.id} value={seg.id}>
                          {seg.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
              {selectedSegment && (
                <p className="mt-2 text-xs text-muted-foreground">
                  IIVY Benchmark: ${selectedSegment.benchmark_low.toFixed(2)} - ${selectedSegment.benchmark_high.toFixed(2)} {selectedSegment.benchmark_unit}
                </p>
              )}
            </div>

            {/* Project Size */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <span className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-muted-foreground" />
                  Project Size (sqft) *
                </span>
              </label>
              <input
                type="number"
                required
                min="1"
                value={projectSqft}
                onChange={e => setProjectSqft(e.target.value)}
                placeholder="e.g., 8000"
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {selectedSegment && projectSqft && parseInt(projectSqft) > 0 && (
                <p className="mt-2 text-xs text-accent">
                  Estimated benchmark: ${(selectedSegment.benchmark_low * parseInt(projectSqft)).toLocaleString()} - ${(selectedSegment.benchmark_high * parseInt(projectSqft)).toLocaleString()}
                </p>
              )}
            </div>

            {/* Additional Requirements */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <span className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  Additional Requirements (optional)
                </span>
              </label>
              <textarea
                value={additionalRequirements}
                onChange={e => setAdditionalRequirements(e.target.value)}
                placeholder="e.g., Premium finish, include installation, specific materials, timeline requirements..."
                rows={3}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Describe any specific requirements or preferences for your quote
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !selectedSegment || !projectSqft || !projectAddress?.region}
              className="w-full px-6 py-4 bg-accent text-background font-semibold rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Finding Vendors & Generating Quotes...
                </>
              ) : (
                <>
                  <Quote className="w-5 h-5" />
                  Get Quotes
                </>
              )}
            </button>

            <p className="text-xs text-center text-muted-foreground">
              We&apos;ll match you with vendors in your area and generate AI-powered quotes
            </p>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
