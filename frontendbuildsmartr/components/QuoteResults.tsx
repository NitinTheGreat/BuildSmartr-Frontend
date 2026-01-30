"use client"

import { motion } from "framer-motion"
import { 
  Quote, X, CheckCircle2, AlertCircle, Building2, Clock, 
  DollarSign, TrendingUp, TrendingDown, Mail, ChevronDown, 
  ChevronUp, RefreshCw, Users
} from "lucide-react"
import { useState } from "react"
import type { QuoteRequest, VendorQuote, IIVYBenchmark } from "@/types/project"

interface QuoteResultsProps {
  quote: QuoteRequest
  onClose: () => void
  onNewQuote: () => void
}

export function QuoteResults({ quote, onClose, onNewQuote }: QuoteResultsProps) {
  const [expandedVendor, setExpandedVendor] = useState<number | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatRate = (rate: number) => {
    return `$${rate.toFixed(2)}/sf`
  }

  const getQuoteStatus = (vendorTotal: number, benchmark: IIVYBenchmark) => {
    const low = benchmark.range_total.low
    const high = benchmark.range_total.high
    const mid = (low + high) / 2

    if (vendorTotal < low) {
      return { label: "Below Benchmark", color: "text-green-400", icon: TrendingDown }
    } else if (vendorTotal > high) {
      return { label: "Above Benchmark", color: "text-amber-400", icon: TrendingUp }
    } else if (vendorTotal <= mid) {
      return { label: "Competitive", color: "text-blue-400", icon: CheckCircle2 }
    } else {
      return { label: "Within Range", color: "text-muted-foreground", icon: CheckCircle2 }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-surface border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border/50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Quote className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Quote Results</h2>
                <p className="text-sm text-muted-foreground">
                  {quote.segment_name} · {quote.project_sqft.toLocaleString()} sqft
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* IIVY Benchmark Section - Always shown */}
          {quote.iivy_benchmark && (
            <div className="p-5 bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">IIVY Benchmark</h3>
                  <p className="text-xs text-muted-foreground">Market rate comparison</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-surface/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Per sqft</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatRate(quote.iivy_benchmark.range_per_sf.low)} - {formatRate(quote.iivy_benchmark.range_per_sf.high)}
                  </p>
                </div>
                <div className="text-center p-3 bg-surface/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Total Estimate</p>
                  <p className="text-lg font-semibold text-accent">
                    {formatCurrency(quote.iivy_benchmark.range_total.low)} - {formatCurrency(quote.iivy_benchmark.range_total.high)}
                  </p>
                </div>
              </div>

              {quote.iivy_benchmark.notes && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  {quote.iivy_benchmark.notes}
                </p>
              )}
            </div>
          )}

          {/* Vendor Quotes Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Vendor Quotes</h3>
                <span className="text-xs bg-muted/50 px-2 py-0.5 rounded-full text-muted-foreground">
                  {quote.vendor_quotes.length} found
                </span>
              </div>
            </div>

            {quote.vendor_quotes.length === 0 ? (
              <div className="text-center py-8 px-4 bg-muted/20 border border-dashed border-border rounded-xl">
                <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium mb-1">No vendors found in your area</p>
                <p className="text-sm text-muted-foreground mb-4">
                  No vendors currently serve {quote.address?.city || quote.address?.region} for {quote.segment_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Use the IIVY Benchmark above as a reference for expected pricing.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {quote.vendor_quotes.map((vendor, index) => {
                  const status = quote.iivy_benchmark 
                    ? getQuoteStatus(vendor.total, quote.iivy_benchmark) 
                    : null
                  const isExpanded = expandedVendor === index
                  const StatusIcon = status?.icon || CheckCircle2

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border border-border rounded-xl overflow-hidden hover:border-border/80 transition-colors"
                    >
                      {/* Vendor Header - Always Visible */}
                      <button
                        onClick={() => setExpandedVendor(isExpanded ? null : index)}
                        className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{vendor.company_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {status && (
                                <span className={`flex items-center gap-1 text-xs ${status.color}`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {status.label}
                                </span>
                              )}
                              {vendor.lead_time && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {vendor.lead_time}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-lg font-semibold text-foreground">
                              {formatCurrency(vendor.total)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatRate(vendor.final_rate_per_sf)}
                            </p>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          className="border-t border-border bg-muted/10 p-4 space-y-4"
                        >
                          {/* Price Breakdown */}
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Price Breakdown
                            </p>
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Base Rate</span>
                                <span className="text-foreground">{formatRate(vendor.base_rate_per_sf)}</span>
                              </div>
                              {vendor.adjustments.map((adj, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">{adj.reason}</span>
                                  <span className={adj.delta_per_sf >= 0 ? "text-amber-400" : "text-green-400"}>
                                    {adj.delta_per_sf >= 0 ? "+" : ""}{formatRate(adj.delta_per_sf)}
                                  </span>
                                </div>
                              ))}
                              <div className="flex justify-between text-sm pt-2 border-t border-border/50">
                                <span className="font-medium text-foreground">Final Rate</span>
                                <span className="font-medium text-foreground">{formatRate(vendor.final_rate_per_sf)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  × {quote.project_sqft.toLocaleString()} sqft
                                </span>
                                <span className="font-semibold text-accent">{formatCurrency(vendor.total)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Company Description */}
                          {vendor.company_description && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                About Company
                              </p>
                              <p className="text-sm text-foreground/80">
                                {vendor.company_description}
                              </p>
                            </div>
                          )}

                          {/* Notes */}
                          {vendor.notes && vendor.notes.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Notes
                              </p>
                              <ul className="space-y-1">
                                {vendor.notes.map((note, i) => (
                                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <span className="text-accent mt-1">•</span>
                                    {note}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Contact Section */}
                          <div className="pt-3 border-t border-border/50 space-y-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Contact Vendor
                            </p>
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <p className="text-sm text-foreground font-medium">
                                  {vendor.contact_email || vendor.user_email}
                                </p>
                              </div>
                              <a
                                href={`mailto:${vendor.contact_email || vendor.user_email}?subject=Quote Request - ${quote.segment_name}&body=Hi,%0A%0AI received your quote through IIVY for ${quote.segment_name} services.%0A%0AProject Details:%0A- Size: ${quote.project_sqft.toLocaleString()} sqft%0A- Your Quote: ${formatCurrency(vendor.total)}%0A%0AI would like to discuss this further.%0A%0ABest regards`}
                                className="px-4 py-2 bg-accent text-background text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors flex items-center gap-2"
                              >
                                <Mail className="w-4 h-4" />
                                Email
                              </a>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border/50">
            <button
              onClick={onNewQuote}
              className="flex-1 px-4 py-3 border border-border text-foreground rounded-xl hover:bg-muted/30 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              New Quote
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-accent text-background font-medium rounded-xl hover:bg-accent/90 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
