export type FileCategory = 'construction' | 'architectural' | 'other'

export type SearchMode = 'web' | 'email' | 'quotes' | 'pdf'

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
  createdAt: Date
  updatedAt: Date
}

export interface GeneralChat {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

export interface Project {
  id: string
  name: string
  description: string
  files: ProjectFile[]
  chats: ProjectChat[]
  createdAt: Date
  updatedAt: Date
}
