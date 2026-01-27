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

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  searchModes?: SearchMode[]
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
