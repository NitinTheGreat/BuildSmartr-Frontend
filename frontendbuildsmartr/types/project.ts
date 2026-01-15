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
}

// ============================================
// Indexing Types
// ============================================

export interface ProjectIndexingState {
  projectId: string
  projectName: string
  status: 'pending' | 'indexing' | 'completed' | 'error'
  percent: number
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

export interface IndexingProgressLog {
  step: string
  percent: number
  timestamp: number
}

export interface IndexingResponse {
  status: string
  project_id: string
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
