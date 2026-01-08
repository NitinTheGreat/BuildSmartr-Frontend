// API Response Types (matching backend responses)

export interface ProjectResponse {
  id: string
  user_id: string
  name: string
  description: string
  company_address: string
  tags: string[]
  is_owner: boolean
  permission: "owner" | "edit" | "view"
  files?: ProjectFileResponse[]
  chats?: ChatResponse[]
  // SHARE FEATURE DISABLED
  // shares?: ShareResponse[]
  created_at: string
  updated_at: string
}

export interface ProjectFileResponse {
  id: string
  project_id: string
  name: string
  size: number
  type: string
  category: "construction" | "architectural" | "other"
  url: string | null
  created_at: string
}

export interface ChatResponse {
  id: string
  user_id: string
  project_id: string | null
  title: string
  chat_type: "project" | "general"
  messages?: MessageResponse[]
  message_count?: number
  created_at: string
  updated_at: string
}

export interface MessageResponse {
  id: string
  chat_id: string
  role: "user" | "assistant"
  content: string
  search_modes: string[] | null
  timestamp: string
}

// SHARE FEATURE DISABLED - Uncomment to re-enable
// export interface ShareResponse {
//   id: string
//   project_id: string
//   shared_with_email: string
//   permission: "view" | "edit"
//   created_at: string
// }

// Placeholder type to prevent import errors
export interface ShareResponse {
  id: string
  project_id: string
  shared_with_email: string
  permission: "view" | "edit"
  created_at: string
}

export interface UserInfoResponse {
  id: string
  email: string
  full_name: string | null
  company_name: string | null
  company_address: string | null
  gmail_connected: boolean
  outlook_connected: boolean
  created_at: string
  updated_at: string
}

export interface HealthCheckResponse {
  status: string
  timestamp: string
}

// API Error type
export interface ApiErrorResponse {
  error: string
}
