"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Upload, File, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useProjects } from "@/contexts/ProjectContext"
import type { ProjectFile } from "@/types/project"
import { useRouter } from "next/navigation"

interface NewProjectModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { createProject } = useProjects()
  const router = useRouter()

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return
    
    const newFiles: ProjectFile[] = Array.from(selectedFiles).map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
    }))
    
    setFiles(prev => [...prev, ...newFiles])
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const project = createProject(name.trim(), description.trim(), files)
    
    // Reset form
    setName("")
    setDescription("")
    setFiles([])
    onClose()
    
    // Navigate to the new project
    router.push(`/project/${project.id}`)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#2b2d31] border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">New Project</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#3c3f45] transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Project Name */}
              <div>
                <label htmlFor="projectName" className="block text-sm font-medium text-foreground mb-2">
                  Project Name
                </label>
                <input
                  id="projectName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter project name..."
                  className="w-full px-3 py-2 bg-[#1f2121] border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="projectDescription" className="block text-sm font-medium text-foreground mb-2">
                  Description
                  <span className="text-muted-foreground font-normal ml-1">(helps AI understand context)</span>
                </label>
                <textarea
                  id="projectDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this project is about..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[#1f2121] border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Add Files
                  <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                </label>
                
                {/* Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                    ${isDragging 
                      ? 'border-accent bg-accent/10' 
                      : 'border-border hover:border-muted-foreground'
                    }
                  `}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop files here, or click to browse
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                  />
                </div>

                {/* File List */}
                {files.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-32 overflow-y-auto">
                    {files.map(file => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2 bg-[#1f2121] rounded-lg"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm text-foreground truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="p-1 hover:bg-[#3c3f45] rounded transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="bg-transparent border-border hover:bg-[#3c3f45]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!name.trim()}
                  className="bg-accent hover:bg-accent-strong text-background"
                >
                  Create Project
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
