import { Globe, Mail, Quote, FileText, type LucideIcon } from "lucide-react"
import type { SearchMode } from "@/types/project"

/**
 * Search mode configuration
 */
export interface SearchModeOption {
  id: SearchMode
  label: string
  icon: LucideIcon
  /** If true, this mode cannot be combined with others */
  exclusive?: boolean
}

/**
 * Available search modes for chat interfaces
 */
export const SEARCH_MODE_OPTIONS: SearchModeOption[] = [
  { id: 'web', label: 'Web Search', icon: Globe },
  { id: 'email', label: 'Email Search', icon: Mail },
  { id: 'quotes', label: 'Quotes', icon: Quote },
  { id: 'pdf', label: 'PDF Search', icon: FileText, exclusive: true },
]

/**
 * Get the icon component for a search mode
 */
export function getModeIcon(mode: SearchMode): LucideIcon {
  const option = SEARCH_MODE_OPTIONS.find(o => o.id === mode)
  return option?.icon || Globe
}

/**
 * Get the label for a search mode
 */
export function getModeLabel(mode: SearchMode): string {
  const option = SEARCH_MODE_OPTIONS.find(o => o.id === mode)
  return option?.label || mode
}

/**
 * Check if a search mode is exclusive (cannot be combined with others)
 */
export function isModeExclusive(mode: SearchMode): boolean {
  const option = SEARCH_MODE_OPTIONS.find(o => o.id === mode)
  return option?.exclusive ?? false
}

/**
 * File category icons and labels
 */
export const FILE_CATEGORIES = {
  construction: {
    label: 'Construction',
    description: 'Construction drawings & specs',
  },
  architectural: {
    label: 'Architectural',
    description: 'Architectural plans & designs',
  },
  other: {
    label: 'Other',
    description: 'Other project documents',
  },
} as const

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
