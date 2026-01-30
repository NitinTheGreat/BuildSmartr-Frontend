export type FileCategory = 'construction' | 'architectural' | 'other'

export type SearchMode = 'web' | 'email' | 'quotes' | 'pdf'

// SHARE FEATURE DISABLED - Uncomment to re-enable
// export type SharePermission = 'view' | 'edit'
// export interface ProjectShare {
//   id: string
//   projectId: string
//   sharedWithEmail: string
//   permission: SharePermission
//   createdAt: Date
// }

// Placeholder types to prevent import errors
export type SharePermission = 'view' | 'edit'
export interface ProjectShare {
  id: string
  projectId: string
  sharedWithEmail: string
  permission: SharePermission
  createdAt: Date
}

export interface ProjectFile {
  id: string
  name: string
  size: number
  type: string
  category: FileCategory
  url?: string
}

// Source item for AI responses
export interface MessageSource {
  chunk_id: string
  chunk_type: string
  text: string
  score: number
  sender: string
  timestamp: string
  subject: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  searchModes?: SearchMode[]
  sources?: MessageSource[]  // Sources for AI assistant responses
}

export interface ProjectChat {
  id: string
  title: string
  messages: ChatMessage[]
  messageCount: number
  createdAt: Date
  updatedAt: Date
}

export interface GeneralChat {
  id: string
  title: string
  messages: ChatMessage[]
  messageCount: number
  createdAt: Date
  updatedAt: Date
}

export interface Project {
  id: string
  name: string
  description: string
  companyAddress: string
  tags: string[]
  files: ProjectFile[]
  chats: ProjectChat[]
  createdAt: Date
  updatedAt: Date
  // AI Integration fields
  aiProjectId?: string | null
  indexingStatus?: 'not_started' | 'indexing' | 'completed' | 'failed' | null
  indexingError?: string | null
  // Structured address fields for quotes feature
  addressStreet?: string
  addressCity?: string
  addressRegion?: string
  addressCountry?: string
  addressPostal?: string
}

// ============================================
// Indexing Types
// ============================================

/** Indexing status values from the backend */
export type IndexingStatus = 'pending' | 'indexing' | 'vectorizing' | 'completed' | 'error' | 'not_found' | 'cancelling' | 'cancelled'

export interface ProjectIndexingState {
  projectId: string
  projectName: string
  /** Supabase project UUID used for status polling */
  backendProjectId?: string
  /** AI backend's human-readable project ID (e.g., "youtube_a1b2c3d4") */
  aiProjectId?: string
  status: IndexingStatus
  /** Short phase name: "Searching", "Processing PDFs", "Creating Embeddings" */
  phase?: string
  percent: number
  /** Full step message: "Searching for project-related emails..." */
  currentStep: string
  startedAt: number
  completedAt?: number
  error?: string
  stats?: {
    thread_count: number
    message_count: number
    pdf_count: number
    vector_count?: number
  }
}

/**
 * Response from GET /api/get_project_status
 */
export interface ProgressStatusResponse {
  project_id: string
  status: IndexingStatus
  /** Short phase name: "Searching", "Processing PDFs", "Creating Embeddings" */
  phase?: string
  /** Full step message: "Searching for project-related emails..." */
  step?: string
  percent: number
  details?: {
    thread_count: number
    message_count: number
    pdf_count: number
  }
  updated_at?: number
  error?: string
}

export interface IndexingProgressLog {
  step: string
  percent: number
  timestamp: number
}


export interface IndexingResponse {
  status: string
  /** Unique project ID with user hash suffix (e.g., "youtube_a1b2c3d4"). Use for all API calls. */
  project_id: string
  /** Human-readable project name (e.g., "YouTube"). Display to users. */
  project_name: string
  stats: {
    thread_count: number
    message_count: number
    pdf_count: number
    indexed_at: string
  }
  vectorization: {
    namespace: string
    vectors_created: number
    message_chunks: number
    attachment_chunks: number
    duration_seconds: number
  }
  storage_paths: {
    threads_data: string
    attachments_data: string
  }
  progress_log: IndexingProgressLog[]
}


// ============================================
// Quote Feature Types
// ============================================

/** A single trade segment with benchmark pricing */
export interface Segment {
  id: string
  name: string
  phase?: string
  phase_order?: number
  benchmark_low: number
  benchmark_high: number
  benchmark_unit: string
  notes?: string
}

/** Phase grouping for segments dropdown */
export interface SegmentPhase {
  name: string
  order: number
  segments: Segment[]
}

/** Segments grouped by phase */
export interface SegmentsResponse {
  phases: SegmentPhase[]
}

/** Vendor service offering for quotes */
export interface VendorService {
  id: string
  company_name: string
  segment: string
  segment_name?: string
  segment_phase?: string
  benchmark_low?: number
  benchmark_high?: number
  countries_served: string[]
  regions_served: string[]
  pricing_rules?: string
  lead_time?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/** Form data for creating/updating vendor service */
export interface VendorServiceFormData {
  company_name: string
  segment: string
  countries_served: string[]
  regions_served: string[]
  pricing_rules?: string
  lead_time?: string
  notes?: string
}

/** Adjustment to quote pricing */
export interface QuoteAdjustment {
  reason: string
  delta_per_sf: number
}

/** Individual vendor quote */
export interface VendorQuote {
  company_name: string
  user_email: string
  base_rate_per_sf: number
  adjustments: QuoteAdjustment[]
  final_rate_per_sf: number
  total: number
  lead_time?: string
  notes: string[]
}

/** IIVY benchmark calculation */
export interface IIVYBenchmark {
  segment_id: string
  segment_name: string
  benchmark_unit: string
  range_per_sf: {
    low: number
    high: number
  }
  range_total: {
    low: number
    high: number
  }
  project_sqft: number
  notes?: string
}

/** Project address for quotes */
export interface ProjectAddress {
  street?: string
  city?: string
  region?: string
  country?: string
  postal?: string
}

/** Full quote request with results */
export interface QuoteRequest {
  id: string
  project_id: string
  chat_id?: string
  segment: string
  segment_name?: string
  segment_phase?: string
  project_sqft: number
  options?: Record<string, unknown>
  address: ProjectAddress
  status: 'matching_vendors' | 'generating_quotes' | 'completed' | 'failed'
  matched_vendors?: { user_email: string; company_name: string }[]
  matched_vendors_count?: number
  vendor_quotes: VendorQuote[]
  iivy_benchmark?: IIVYBenchmark
  error_message?: string
  created_at: string
  completed_at?: string
}

/** Summary of quote for list views */
export interface QuoteSummary {
  id: string
  segment: string
  segment_name?: string
  project_sqft: number
  status: string
  vendor_quotes_count: number
  benchmark_range: {
    low?: number
    high?: number
  }
  created_at: string
  completed_at?: string
}

/** Quote request form data */
export interface QuoteRequestFormData {
  segment: string
  project_sqft: number
  options?: Record<string, unknown>
  chat_id?: string
}
