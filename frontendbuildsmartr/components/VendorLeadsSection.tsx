"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  DollarSign, Mail, MapPin, Ruler, Clock, 
  ChevronDown, ChevronUp, Loader2, Users, TrendingUp,
  Calendar, Building2
} from "lucide-react"

interface VendorLead {
  id: string
  segment: string
  segment_name?: string
  customer_name?: string
  customer_email: string
  project_name: string
  project_location: string
  project_sqft: number
  quoted_rate_per_sf: number
  quoted_total: number
  amount_charged: number
  billing_status: string
  email_status?: string
  created_at: string
}

interface BillingSummary {
  total_leads: number
  total_charged: number
  total_paid: number
  balance_due: number
  leads_by_status: {
    pending: number
    invoiced: number
    paid: number
  }
}

interface MonthGroup {
  key: string
  label: string
  leads: VendorLead[]
  totalCharged: number
  totalQuoted: number
}

export default function VendorLeadsSection() {
  const [leads, setLeads] = useState<VendorLead[]>([])
  const [billing, setBilling] = useState<BillingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedLead, setExpandedLead] = useState<string | null>(null)
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchData() {
      try {
        const [leadsRes, billingRes] = await Promise.all([
          fetch("/api/vendors/me/leads"),
          fetch("/api/vendors/me/billing"),
        ])

        if (leadsRes.ok) {
          const leadsData = await leadsRes.json()
          const fetchedLeads = Array.isArray(leadsData) ? leadsData : (leadsData.data || [])
          setLeads(fetchedLeads)
          
          // Auto-expand the most recent month
          if (fetchedLeads.length > 0) {
            const mostRecentDate = new Date(fetchedLeads[0].created_at)
            const monthKey = `${mostRecentDate.getFullYear()}-${String(mostRecentDate.getMonth() + 1).padStart(2, '0')}`
            setExpandedMonths(new Set([monthKey]))
          }
        }

        if (billingRes.ok) {
          const billingData = await billingRes.json()
          setBilling(billingData.data || billingData || null)
        }
      } catch (err) {
        console.error("Failed to fetch vendor data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Group leads by month
  const monthGroups = useMemo(() => {
    const groups: Record<string, MonthGroup> = {}
    
    leads.forEach(lead => {
      const date = new Date(lead.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      
      if (!groups[key]) {
        groups[key] = {
          key,
          label,
          leads: [],
          totalCharged: 0,
          totalQuoted: 0,
        }
      }
      
      groups[key].leads.push(lead)
      groups[key].totalCharged += lead.amount_charged
      groups[key].totalQuoted += lead.quoted_total
    })
    
    // Sort by month (most recent first)
    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key))
  }, [leads])

  const toggleMonth = (key: string) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">
          Your Leads
        </h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading leads...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            Your Leads
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Customers who viewed your quotes and their contact info.
          </p>
        </div>
      </div>

      {/* Billing Summary */}
      {billing && billing.total_leads > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-4 bg-accent/10 border border-accent/20 rounded-xl">
          <div className="text-center">
            <p className="text-2xl font-bold text-accent">{billing.total_leads}</p>
            <p className="text-xs text-muted-foreground">Total Leads</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{formatCurrency(billing.total_charged)}</p>
            <p className="text-xs text-muted-foreground">Total Charged</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{formatCurrency(billing.total_paid)}</p>
            <p className="text-xs text-muted-foreground">Paid</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-400">{formatCurrency(billing.balance_due)}</p>
            <p className="text-xs text-muted-foreground">Balance Due</p>
          </div>
        </div>
      )}

      {leads.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-lg">
          <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground mb-2">
            No leads yet
          </p>
          <p className="text-sm text-muted-foreground">
            When customers view your quotes, their contact info will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {monthGroups.map(group => {
            const isMonthExpanded = expandedMonths.has(group.key)
            
            return (
              <div key={group.key} className="border border-border rounded-xl overflow-hidden">
                {/* Month Header */}
                <button
                  onClick={() => toggleMonth(group.key)}
                  className="w-full p-4 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-accent" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">{group.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.leads.length} lead{group.leads.length !== 1 ? 's' : ''} · {formatCurrency(group.totalCharged)} charged
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm text-muted-foreground">Quote Value</p>
                      <p className="font-medium text-accent">{formatCurrency(group.totalQuoted)}</p>
                    </div>
                    {isMonthExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Month's Leads */}
                {isMonthExpanded && (
                  <div className="divide-y divide-border/50">
                    {group.leads.map(lead => {
                      const isLeadExpanded = expandedLead === lead.id
                      
                      return (
                        <div key={lead.id} className="bg-surface">
                          {/* Lead Row */}
                          <button
                            onClick={() => setExpandedLead(isLeadExpanded ? null : lead.id)}
                            className="w-full p-4 flex items-center justify-between hover:bg-muted/20 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-foreground truncate">
                                    {lead.segment_name || lead.segment}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                                    lead.billing_status === 'paid'
                                      ? 'bg-green-500/20 text-green-400'
                                      : lead.billing_status === 'invoiced'
                                      ? 'bg-blue-500/20 text-blue-400'
                                      : 'bg-amber-500/20 text-amber-400'
                                  }`}>
                                    {lead.billing_status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1 truncate">
                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{lead.project_location}</span>
                                  </span>
                                  <span className="flex items-center gap-1 flex-shrink-0">
                                    <Clock className="w-3 h-3" />
                                    {formatDate(lead.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                              <div className="text-right">
                                <p className="text-sm font-medium text-accent">
                                  {formatCurrency(lead.quoted_total)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  ${lead.quoted_rate_per_sf.toFixed(2)}/sf
                                </p>
                              </div>
                              {isLeadExpanded ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </button>

                          {/* Expanded Lead Details */}
                          {isLeadExpanded && (
                            <div className="border-t border-border/50 bg-muted/10 p-4 space-y-4">
                              {/* Project Details */}
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                  Project Details
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Project:</span>
                                    <span className="ml-2 text-foreground">{lead.project_name}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Ruler className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-foreground">{lead.project_sqft.toLocaleString()} sqft</span>
                                  </div>
                                </div>
                              </div>

                              {/* Customer Contact */}
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                  Customer Contact
                                </p>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface rounded-lg border border-border">
                                  <div className="min-w-0">
                                    <p className="text-foreground font-medium truncate">
                                      {lead.customer_name || "Project Owner"}
                                    </p>
                                    <p className="text-sm text-muted-foreground truncate">{lead.customer_email}</p>
                                  </div>
                                  <a
                                    href={`mailto:${lead.customer_email}?subject=Re: ${lead.segment_name || lead.segment} Quote for ${lead.project_name}&body=Hi ${lead.customer_name || 'there'},%0A%0AI saw your request for ${lead.segment_name || lead.segment} services and would love to discuss your project.%0A%0ABest regards`}
                                    className="px-4 py-2 bg-accent text-background text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors flex items-center justify-center gap-2 flex-shrink-0"
                                  >
                                    <Mail className="w-4 h-4" />
                                    Email Customer
                                  </a>
                                </div>
                              </div>

                              {/* Charge Info */}
                              <div className="flex items-center justify-between pt-3 border-t border-border/50 text-sm">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <DollarSign className="w-4 h-4" />
                                  Lead Fee
                                </span>
                                <span className="text-foreground font-medium">
                                  {formatCurrency(lead.amount_charged)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Footer note */}
      {leads.length > 0 && (
        <p className="text-xs text-muted-foreground text-center mt-4">
          Each lead costs $250. You&apos;ll receive an invoice at the end of the billing period.
        </p>
      )}
    </div>
  )
}
