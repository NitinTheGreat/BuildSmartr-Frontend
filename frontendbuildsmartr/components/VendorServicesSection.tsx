"use client"

import { useState, useEffect } from "react"
import { VendorService, Segment, SegmentsResponse } from "@/types/project"

interface VendorServicesSectionProps {
  initialServices?: VendorService[]
}

// Canadian provinces and US states
const REGIONS = {
  CA: [
    { value: "BC", label: "British Columbia" },
    { value: "AB", label: "Alberta" },
    { value: "SK", label: "Saskatchewan" },
    { value: "MB", label: "Manitoba" },
    { value: "ON", label: "Ontario" },
    { value: "QC", label: "Quebec" },
    { value: "NB", label: "New Brunswick" },
    { value: "NS", label: "Nova Scotia" },
    { value: "PE", label: "Prince Edward Island" },
    { value: "NL", label: "Newfoundland and Labrador" },
    { value: "YT", label: "Yukon" },
    { value: "NT", label: "Northwest Territories" },
    { value: "NU", label: "Nunavut" },
  ],
  US: [
    { value: "AL", label: "Alabama" },
    { value: "AK", label: "Alaska" },
    { value: "AZ", label: "Arizona" },
    { value: "AR", label: "Arkansas" },
    { value: "CA", label: "California" },
    { value: "CO", label: "Colorado" },
    { value: "CT", label: "Connecticut" },
    { value: "DE", label: "Delaware" },
    { value: "FL", label: "Florida" },
    { value: "GA", label: "Georgia" },
    { value: "HI", label: "Hawaii" },
    { value: "ID", label: "Idaho" },
    { value: "IL", label: "Illinois" },
    { value: "IN", label: "Indiana" },
    { value: "IA", label: "Iowa" },
    { value: "KS", label: "Kansas" },
    { value: "KY", label: "Kentucky" },
    { value: "LA", label: "Louisiana" },
    { value: "ME", label: "Maine" },
    { value: "MD", label: "Maryland" },
    { value: "MA", label: "Massachusetts" },
    { value: "MI", label: "Michigan" },
    { value: "MN", label: "Minnesota" },
    { value: "MS", label: "Mississippi" },
    { value: "MO", label: "Missouri" },
    { value: "MT", label: "Montana" },
    { value: "NE", label: "Nebraska" },
    { value: "NV", label: "Nevada" },
    { value: "NH", label: "New Hampshire" },
    { value: "NJ", label: "New Jersey" },
    { value: "NM", label: "New Mexico" },
    { value: "NY", label: "New York" },
    { value: "NC", label: "North Carolina" },
    { value: "ND", label: "North Dakota" },
    { value: "OH", label: "Ohio" },
    { value: "OK", label: "Oklahoma" },
    { value: "OR", label: "Oregon" },
    { value: "PA", label: "Pennsylvania" },
    { value: "RI", label: "Rhode Island" },
    { value: "SC", label: "South Carolina" },
    { value: "SD", label: "South Dakota" },
    { value: "TN", label: "Tennessee" },
    { value: "TX", label: "Texas" },
    { value: "UT", label: "Utah" },
    { value: "VT", label: "Vermont" },
    { value: "VA", label: "Virginia" },
    { value: "WA", label: "Washington" },
    { value: "WV", label: "West Virginia" },
    { value: "WI", label: "Wisconsin" },
    { value: "WY", label: "Wyoming" },
    { value: "DC", label: "Washington D.C." },
  ],
}

export default function VendorServicesSection({ initialServices = [] }: VendorServicesSectionProps) {
  const [services, setServices] = useState<VendorService[]>(initialServices)
  const [segments, setSegments] = useState<SegmentsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingService, setEditingService] = useState<VendorService | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    company_name: "",
    segment: "",
    countries_served: ["CA"] as string[],
    regions_served: [] as string[],
    pricing_rules: "",
    lead_time: "",
    notes: "",
  })

  // Fetch services and segments on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [servicesRes, segmentsRes] = await Promise.all([
          fetch("/api/vendor-services"),
          fetch("/api/segments"),
        ])

        if (servicesRes.ok) {
          const servicesData = await servicesRes.json()
          // Backend returns array directly, not wrapped in data
          setServices(Array.isArray(servicesData) ? servicesData : (servicesData.data || []))
        }

        if (segmentsRes.ok) {
          const segmentsData = await segmentsRes.json()
          // Segments endpoint wraps in data, but check both formats
          setSegments(segmentsData.data || segmentsData || null)
        }
      } catch (err) {
        console.error("Failed to fetch data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const resetForm = () => {
    setFormData({
      company_name: "",
      segment: "",
      countries_served: ["CA"],
      regions_served: [],
      pricing_rules: "",
      lead_time: "",
      notes: "",
    })
    setEditingService(null)
    setError(null)
  }

  const openAddModal = () => {
    resetForm()
    setShowAddModal(true)
  }

  const openEditModal = (service: VendorService) => {
    setFormData({
      company_name: service.company_name,
      segment: service.segment,
      countries_served: service.countries_served,
      regions_served: service.regions_served,
      pricing_rules: service.pricing_rules || "",
      lead_time: service.lead_time || "",
      notes: service.notes || "",
    })
    setEditingService(service)
    setShowAddModal(true)
  }

  const closeModal = () => {
    setShowAddModal(false)
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const url = editingService 
        ? `/api/vendor-services/${editingService.id}` 
        : "/api/vendor-services"
      
      const method = editingService ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        // Extract error message from validation response
        const errorMessage = data.errors?.[0]?.message || data.message || data.error || "Failed to save service"
        throw new Error(errorMessage)
      }

      // Backend returns the service directly, not wrapped in data
      const service = data.data || data
      
      if (editingService) {
        setServices(prev => prev.map(s => s.id === editingService.id ? service : s))
      } else {
        setServices(prev => [service, ...prev])
      }

      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save service")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return

    try {
      const res = await fetch(`/api/vendor-services/${serviceId}`, {
        method: "DELETE",
      })

      if (!res.ok && res.status !== 204) {
        const data = await res.json()
        throw new Error(data.message || data.error || "Failed to delete service")
      }

      setServices(prev => prev.filter(s => s.id !== serviceId))
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete service")
    }
  }

  const toggleCountry = (country: string) => {
    setFormData(prev => {
      const newCountries = prev.countries_served.includes(country)
        ? prev.countries_served.filter(c => c !== country)
        : [...prev.countries_served, country]
      
      // Also clear regions that don't belong to selected countries
      const validRegions = newCountries.flatMap(c => 
        (REGIONS[c as keyof typeof REGIONS] || []).map(r => r.value)
      )
      const newRegions = prev.regions_served.filter(r => validRegions.includes(r))
      
      return { ...prev, countries_served: newCountries, regions_served: newRegions }
    })
  }

  const toggleRegion = (region: string) => {
    setFormData(prev => ({
      ...prev,
      regions_served: prev.regions_served.includes(region)
        ? prev.regions_served.filter(r => r !== region)
        : [...prev.regions_served, region]
    }))
  }

  const getAvailableRegions = () => {
    return formData.countries_served.flatMap(country => 
      REGIONS[country as keyof typeof REGIONS] || []
    )
  }

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">
          Vendor Services
        </h3>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-border/50 rounded-lg" />
          <div className="h-20 bg-border/50 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-surface border border-border rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground">
              Vendor Services
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add your services to receive quote requests from other users.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-accent text-background text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors"
          >
            + Add Service
          </button>
        </div>

        {services.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-lg">
            <div className="text-4xl mb-3">🏗️</div>
            <p className="text-muted-foreground mb-4">
              No services added yet. Add your first service to start receiving quote requests.
            </p>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-accent text-background text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors"
            >
              Add Your First Service
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map(service => (
              <div
                key={service.id}
                className="border border-border rounded-lg p-4 hover:border-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-foreground">
                        {service.segment_name || service.segment}
                      </h4>
                      {service.segment_phase && (
                        <span className="text-xs px-2 py-0.5 bg-accent/20 text-accent rounded-full">
                          {service.segment_phase}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {service.company_name}
                    </p>
                    {service.pricing_rules && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {service.pricing_rules}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {service.countries_served.join(", ")}
                        {service.regions_served.length > 0 && (
                          <> · {service.regions_served.join(", ")}</>
                        )}
                      </span>
                      {service.lead_time && (
                        <span className="text-xs text-muted-foreground">
                          ⏱️ {service.lead_time}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEditModal(service)}
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="p-2 text-muted-foreground hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                {editingService ? "Edit Service" : "Add Service"}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={e => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="ABC Windows Ltd."
                />
              </div>

              {/* Segment */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Segment *
                </label>
                <select
                  required
                  value={formData.segment}
                  onChange={e => setFormData(prev => ({ ...prev, segment: e.target.value }))}
                  disabled={!!editingService}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
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
              </div>

              {/* Countries */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Countries Served *
                </label>
                <div className="flex gap-4">
                  {[
                    { value: "CA", label: "🇨🇦 Canada" },
                    { value: "US", label: "🇺🇸 USA" },
                  ].map(country => (
                    <label key={country.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.countries_served.includes(country.value)}
                        onChange={() => toggleCountry(country.value)}
                        className="w-4 h-4 rounded border-border bg-background accent-accent"
                      />
                      <span className="text-foreground">{country.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Regions */}
              {formData.countries_served.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Regions Served
                    <span className="text-muted-foreground font-normal ml-1">
                      (empty = all regions)
                    </span>
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {getAvailableRegions().map(region => (
                        <label key={region.value} className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={formData.regions_served.includes(region.value)}
                            onChange={() => toggleRegion(region.value)}
                            className="w-3 h-3 rounded border-border bg-background accent-accent"
                          />
                          <span className="text-foreground truncate">{region.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing Rules */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Pricing Rules
                </label>
                <textarea
                  value={formData.pricing_rules}
                  onChange={e => setFormData(prev => ({ ...prev, pricing_rules: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  placeholder="Base $14/sf. Richmond +$2/sf. Min $5,000. Premium finish +$3/sf."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Describe your pricing structure. Our AI will parse this to generate quotes.
                </p>
              </div>

              {/* Lead Time */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Lead Time
                </label>
                <input
                  type="text"
                  value={formData.lead_time}
                  onChange={e => setFormData(prev => ({ ...prev, lead_time: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="3-4 weeks"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  placeholder="Excludes tax and permits. Requires site access."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.company_name || !formData.segment || formData.countries_served.length === 0}
                  className="flex-1 px-4 py-2 bg-accent text-background font-medium rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : editingService ? "Update" : "Add Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
