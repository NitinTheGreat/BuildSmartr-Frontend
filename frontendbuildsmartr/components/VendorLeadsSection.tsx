"use client"

import { useState, useEffect } from "react"
import { 
  DollarSign, Mail, MapPin, Ruler, Clock, 
  ChevronDown, ChevronUp, Loader2, Users, TrendingUp 
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

export default function VendorLeadsSection() {
  const [leads, setLeads] = useState<VendorLead[]>([])
  const [billing, setBilling] = useState<BillingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedLead, setExpandedLead] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [leadsRes, billingRes] = await Promise.all([
          fetch("/api/vendors/me/leads"),
          fetch("/api/vendors/me/billing"),
        ])

        if (leadsRes.ok) {
          const leadsData = await leadsRes.json()
          setLeads(Array.isArray(leadsData) ? leadsData : (leadsData.data || []))
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
      year: "numeric",
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
        <div className="space-y-3">
          {leads.map(lead => {
            const isExpanded = expandedLead === lead.id
            
            return (
              <div
                key={lead.id}
                className="border border-border rounded-lg overflow-hidden hover:border-accent/30 transition-colors"
              >
                {/* Lead Header */}
                <button
                  onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">
                        {lead.segment_name || lead.segment}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        lead.billing_status === 'paid'
                          ? 'bg-green-500/20 text-green-400'
                          : lead.billing_status === 'invoiced'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {lead.billing_status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {lead.project_location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(lead.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-accent">
                        {formatCurrency(lead.quoted_total)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ${lead.quoted_rate_per_sf.toFixed(2)}/sf
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
                  <div className="border-t border-border bg-muted/10 p-4 space-y-4">
                    {/* Project Details */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Project Details
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
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
                      <div className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border">
                        <div>
                          <p className="text-foreground font-medium">
                            {lead.customer_name || "Project Owner"}
                          </p>
                          <p className="text-sm text-muted-foreground">{lead.customer_email}</p>
                        </div>
                        <a
                          href={`mailto:${lead.customer_email}?subject=Re: ${lead.segment_name || lead.segment} Quote for ${lead.project_name}&body=Hi ${lead.customer_name || 'there'},%0A%0AI saw your request for ${lead.segment_name || lead.segment} services and would love to discuss your project.%0A%0ABest regards`}
                          className="px-4 py-2 bg-accent text-background text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors flex items-center gap-2"
                        >
                          <Mail className="w-4 h-4" />
                          Email
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

      {/* Footer note */}
      {leads.length > 0 && (
        <p className="text-xs text-muted-foreground text-center mt-4">
          Each lead displayed above cost $250. You&apos;ll receive an invoice at the end of the billing period.
        </p>
      )}
    </div>
  )
}
