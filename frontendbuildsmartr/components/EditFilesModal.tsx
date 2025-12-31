"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, File, Trash2, HardHat, Ruler, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useProjects } from "@/contexts/ProjectContext"
import type { ProjectFile, FileCategory } from "@/types/project"

interface EditFilesModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  currentFiles: ProjectFile[]
}

interface CategoryFile {
  file: ProjectFile | null
  isDragging: boolean
  isNew: boolean
}

type CategoryFiles = Record<FileCategory, CategoryFile>

export function EditFilesModal({ isOpen, onClose, projectId, currentFiles }: EditFilesModalProps) {
  const initializeCategoryFiles = (): CategoryFiles => {
    const initial: CategoryFiles = {
      construction: { file: null, isDragging: false, isNew: false },
      architectural: { file: null, isDragging: false, isNew: false },
      other: { file: null, isDragging: false, isNew: false },
    }
    
    currentFiles.forEach(file => {
      if (file.category && initial[file.category]) {
        initial[file.category] = { file, isDragging: false, isNew: false }
      }
    })
    
    return initial
  }

  const [categoryFiles, setCategoryFiles] = useState<CategoryFiles>(initializeCategoryFiles)
  const [removedFileIds, setRemovedFileIds] = useState<string[]>([])
  
  const fileInputRefs = {
    construction: useRef<HTMLInputElement>(null),
    architectural: useRef<HTMLInputElement>(null),
    other: useRef<HTMLInputElement>(null),
  }
  const { addFilesToProject, removeFileFromProject } = useProjects()

  useEffect(() => {
    if (isOpen) {
      setCategoryFiles(initializeCategoryFiles())
      setRemovedFileIds([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentFiles])

  const handleFileSelect = (selectedFiles: FileList | null, category: FileCategory) => {
    if (!selectedFiles || selectedFiles.length === 0) return
    
    const file = selectedFiles[0]
    const newFile: ProjectFile = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      category,
    }
    
    // If there was an existing file, mark it for removal
    const existingFile = categoryFiles[category].file
    if (existingFile && !categoryFiles[category].isNew) {
      setRemovedFileIds(prev => [...prev, existingFile.id])
    }
    
    setCategoryFiles(prev => ({
      ...prev,
      [category]: { file: newFile, isDragging: false, isNew: true }
    }))
  }

  const handleDragOver = (e: React.DragEvent, category: FileCategory) => {
    e.preventDefault()
    setCategoryFiles(prev => ({
      ...prev,
      [category]: { ...prev[category], isDragging: true }
    }))
  }

  const handleDragLeave = (e: React.DragEvent, category: FileCategory) => {
    e.preventDefault()
    setCategoryFiles(prev => ({
      ...prev,
      [category]: { ...prev[category], isDragging: false }
    }))
  }

  const handleDrop = (e: React.DragEvent, category: FileCategory) => {
    e.preventDefault()
    setCategoryFiles(prev => ({
      ...prev,
      [category]: { ...prev[category], isDragging: false }
    }))
    handleFileSelect(e.dataTransfer.files, category)
  }

  const removeFile = (category: FileCategory) => {
    const existingFile = categoryFiles[category].file
    if (existingFile && !categoryFiles[category].isNew) {
      setRemovedFileIds(prev => [...prev, existingFile.id])
    }
    
    setCategoryFiles(prev => ({
      ...prev,
      [category]: { file: null, isDragging: false, isNew: false }
    }))
  }

  const handleSave = () => {
    // Remove files that were marked for removal
    removedFileIds.forEach(fileId => {
      removeFileFromProject(projectId, fileId)
    })
    
    // Add new files
    const newFiles = Object.values(categoryFiles)
      .filter(cf => cf.file && cf.isNew)
      .map(cf => cf.file as ProjectFile)
    
    if (newFiles.length > 0) {
      addFilesToProject(projectId, newFiles)
    }
    
    onClose()
  }

  const handleClose = () => {
    setCategoryFiles(initializeCategoryFiles())
    setRemovedFileIds([])
    onClose()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const categoryConfig: Record<FileCategory, { label: string; icon: React.ReactNode; description: string }> = {
    construction: {
      label: 'Construction',
      icon: <HardHat className="w-6 h-6" />,
      description: 'Construction drawings & specs',
    },
    architectural: {
      label: 'Architectural',
      icon: <Ruler className="w-6 h-6" />,
      description: 'Architectural plans & designs',
    },
    other: {
      label: 'Other',
      icon: <FileText className="w-6 h-6" />,
      description: 'Other project documents',
    },
  }

  const FileUploadBox = ({ category }: { category: FileCategory }) => {
    const config = categoryConfig[category]
    const { file, isDragging, isNew } = categoryFiles[category]

    return (
      <div className="flex-1">
        <label className="block text-xs font-medium text-foreground mb-1.5">
          {config.label}
        </label>
        {file ? (
          <div className={`border rounded-lg p-3 ${isNew ? 'bg-accent/10 border-accent/30' : 'bg-[#1f2121] border-border'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <File className={`w-4 h-4 flex-shrink-0 ${isNew ? 'text-accent' : 'text-muted-foreground'}`} />
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{file.name}</p>
                  <div className="flex items-center gap-2">
                    {isNew && <span className="text-xs text-accent">New</span>}
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(category)}
                className="p-1 hover:bg-[#3c3f45] rounded transition-colors flex-shrink-0"
              >
                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-400" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => handleDragOver(e, category)}
            onDragLeave={(e) => handleDragLeave(e, category)}
            onDrop={(e) => handleDrop(e, category)}
            onClick={() => fileInputRefs[category].current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
              ${isDragging 
                ? 'border-accent bg-accent/10' 
                : 'border-border hover:border-muted-foreground hover:bg-[#1f2121]/50'
              }
            `}
          >
            <div className="text-muted-foreground mb-1">{config.icon}</div>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Click or drag</p>
            <input
              ref={fileInputRefs[category]}
              type="file"
              onChange={(e) => handleFileSelect(e.target.files, category)}
              className="hidden"
            />
          </div>
        )}
      </div>
    )
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
              {/* File Upload - 3 Categories */}
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload one file per category. Replacing a file will remove the previous one.
                </p>
                
                <div className="grid grid-cols-3 gap-3">
                  <FileUploadBox category="construction" />
                  <FileUploadBox category="architectural" />
                  <FileUploadBox category="other" />
                </div>
              </div>

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
