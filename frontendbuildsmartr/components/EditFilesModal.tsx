"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, File, Trash2, HardHat, Ruler, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useProjects } from "@/contexts/ProjectContext"
import type { ProjectFile, FileCategory } from "@/types/project"

interface EditFilesModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  currentFiles: ProjectFile[]
}

interface CategoryFile {
  existingFiles: ProjectFile[]  // ALL existing files from server in this category
  newFile: File | null          // New file to upload (replaces all existing)
  isDragging: boolean
}

type CategoryFiles = Record<FileCategory, CategoryFile>

export function EditFilesModal({ isOpen, onClose, projectId, currentFiles }: EditFilesModalProps) {
  const initializeCategoryFiles = (): CategoryFiles => {
    const initial: CategoryFiles = {
      construction: { existingFiles: [], newFile: null, isDragging: false },
      architectural: { existingFiles: [], newFile: null, isDragging: false },
      other: { existingFiles: [], newFile: null, isDragging: false },
    }
    
    // Group all files by category
    currentFiles.forEach(file => {
      if (file.category && initial[file.category]) {
        initial[file.category].existingFiles.push(file)
      }
    })
    
    return initial
  }

  const [categoryFiles, setCategoryFiles] = useState<CategoryFiles>(initializeCategoryFiles)
  const [removedFileIds, setRemovedFileIds] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  
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
    
    // Mark ALL existing files in this category for removal
    const existingFiles = categoryFiles[category].existingFiles
    if (existingFiles.length > 0) {
      setRemovedFileIds(prev => [...prev, ...existingFiles.map(f => f.id)])
    }
    
    setCategoryFiles(prev => ({
      ...prev,
      [category]: { existingFiles: [], newFile: file, isDragging: false }
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
    const cf = categoryFiles[category]
    // Mark ALL existing files for removal
    if (cf.existingFiles.length > 0) {
      setRemovedFileIds(prev => [...prev, ...cf.existingFiles.map(f => f.id)])
    }
    
    setCategoryFiles(prev => ({
      ...prev,
      [category]: { existingFiles: [], newFile: null, isDragging: false }
    }))
  }

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    
    try {
      // Remove files that were marked for removal
      for (const fileId of removedFileIds) {
        await removeFileFromProject(projectId, fileId)
      }
      
      // Add new files by category
      for (const [category, cf] of Object.entries(categoryFiles)) {
        if (cf.newFile) {
          await addFilesToProject(projectId, [cf.newFile], category)
        }
      }
      
      onClose()
    } catch (error) {
      console.error('Failed to save files:', error)
    } finally {
      setIsSaving(false)
    }
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
    const { existingFiles, newFile, isDragging } = categoryFiles[category]
    // Show the most recent existing file if there's no new file
    const latestExistingFile = existingFiles.length > 0 ? existingFiles[existingFiles.length - 1] : null
    const hasFile = latestExistingFile || newFile
    const isNew = !!newFile
    const displayName = newFile?.name || latestExistingFile?.name || ''
    const displaySize = newFile?.size || latestExistingFile?.size || 0
    // Show count if there are multiple existing files
    const extraFilesCount = existingFiles.length > 1 ? existingFiles.length - 1 : 0

    return (
      <div className="flex-1">
        <label className="block text-xs font-medium text-foreground mb-1.5">
          {config.label}
        </label>
        {hasFile ? (
          <div className={`border rounded-lg p-3 ${isNew ? 'bg-accent/10 border-accent/30' : 'bg-[#1f2121] border-border'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <File className={`w-4 h-4 flex-shrink-0 ${isNew ? 'text-accent' : 'text-muted-foreground'}`} />
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{displayName}</p>
                  <div className="flex items-center gap-2">
                    {isNew && <span className="text-xs text-accent">New</span>}
                    <p className="text-xs text-muted-foreground">{formatFileSize(displaySize)}</p>
                    {extraFilesCount > 0 && !isNew && (
                      <span className="text-xs text-yellow-500">+{extraFilesCount} old</span>
                    )}
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#2b2d31] border border-border rounded-xl shadow-2xl z-50 overflow-hidden safe-area-all"
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              paddingLeft: 'env(safe-area-inset-left, 0px)',
              paddingRight: 'env(safe-area-inset-right, 0px)',
            }}
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
                  disabled={isSaving}
                  className="bg-transparent border-border hover:bg-[#3c3f45]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-accent hover:bg-accent-strong text-background gap-2 transition-smooth"
                >
                  {isSaving ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Uploading...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
