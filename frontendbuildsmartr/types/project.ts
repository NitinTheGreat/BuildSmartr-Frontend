export interface ProjectFile {
  id: string
  name: string
  size: number
  type: string
  url?: string
}

export interface Project {
  id: string
  name: string
  description: string
  files: ProjectFile[]
  createdAt: Date
  updatedAt: Date
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}
