"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Upload, File, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useProjects } from "@/contexts/ProjectContext"
import type { ProjectFile } from "@/types/project"

interface EditFilesModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  currentFiles: ProjectFile[]
}

export function EditFilesModal({ isOpen, onClose, projectId, currentFiles }: EditFilesModalProps) {
  const [files, setFiles] = useState<ProjectFile[]>(currentFiles)
  const [newFiles, setNewFiles] = useState<ProjectFile[]>([])
  const [removedFileIds, setRemovedFileIds] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addFilesToProject, removeFileFromProject } = useProjects()

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return
    
    const addedFiles: ProjectFile[] = Array.from(selectedFiles).map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
    }))
    
    setNewFiles(prev => [...prev, ...addedFiles])
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

  const removeExistingFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
    setRemovedFileIds(prev => [...prev, fileId])
  }

  const removeNewFile = (fileId: string) => {
    setNewFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const handleSave = () => {
    // Remove files that were marked for removal
    removedFileIds.forEach(fileId => {
      removeFileFromProject(projectId, fileId)
    })
    
    // Add new files
    if (newFiles.length > 0) {
      addFilesToProject(projectId, newFiles)
    }
    
    onClose()
  }

  const handleClose = () => {
    // Reset state when closing without saving
    setFiles(currentFiles)
    setNewFiles([])
    setRemovedFileIds([])
    onClose()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const allFiles = [...files, ...newFiles]

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
            onClick={handleClose}
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
              <h2 className="text-lg font-semibold text-foreground">Edit Files</h2>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#3c3f45] transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
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
              {allFiles.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <span className="text-xs text-muted-foreground">
                    {allFiles.length} file{allFiles.length !== 1 ? 's' : ''}
                  </span>
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
                        onClick={() => removeExistingFile(file.id)}
                        className="p-1 hover:bg-[#3c3f45] rounded transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive-foreground" />
                      </button>
                    </div>
                  ))}
                  {newFiles.map(file => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-2 bg-accent/10 border border-accent/30 rounded-lg"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <File className="w-4 h-4 text-accent flex-shrink-0" />
                        <span className="text-sm text-foreground truncate">{file.name}</span>
                        <span className="text-xs text-accent flex-shrink-0">New</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeNewFile(file.id)}
                        className="p-1 hover:bg-[#3c3f45] rounded transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No files added to this project yet
                </p>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="bg-transparent border-border hover:bg-[#3c3f45]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-accent hover:bg-accent-strong text-background"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
