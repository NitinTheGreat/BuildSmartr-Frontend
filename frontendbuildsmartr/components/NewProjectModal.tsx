"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Upload, File, Trash2, HardHat, Ruler, FileText, Loader2, AlertCircle, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useProjects } from "@/contexts/ProjectContext"
import { useIndexing } from "@/contexts/IndexingContext"
import type { FileCategory } from "@/types/project"
import { useRouter } from "next/navigation"
import { ProjectIndexingModal } from "./ProjectIndexingModal"

interface NewProjectModalProps {
  isOpen: boolean
  onClose: () => void
}

interface CategoryFileState {
  file: File | null
  preview: { name: string; size: number; type: string } | null
  isDragging: boolean
}

type CategoryFiles = Record<FileCategory, CategoryFileState>

interface EmailConnectionState {
  isChecking: boolean
  isConnected: boolean
  provider: 'gmail' | 'outlook' | null
  email: string | null
  error: string | null
}

export function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [companyAddress, setCompanyAddress] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categoryFiles, setCategoryFiles] = useState<CategoryFiles>({
    construction: { file: null, preview: null, isDragging: false },
    architectural: { file: null, preview: null, isDragging: false },
    other: { file: null, preview: null, isDragging: false },
  })
  const [emailConnection, setEmailConnection] = useState<EmailConnectionState>({
    isChecking: true,
    isConnected: false,
    provider: null,
    email: null,
    error: null
  })
  const [showIndexingModal, setShowIndexingModal] = useState(false)
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null)

  const fileInputRefs = {
    construction: useRef<HTMLInputElement>(null),
    architectural: useRef<HTMLInputElement>(null),
    other: useRef<HTMLInputElement>(null),
  }
  const { createProject } = useProjects()
  const { startIndexing, indexingStates } = useIndexing()
  const router = useRouter()

  // Check email connection when modal opens
  useEffect(() => {
    if (isOpen) {
      checkEmailConnection()
    }
  }, [isOpen])

  const checkEmailConnection = async () => {
    setEmailConnection(prev => ({ ...prev, isChecking: true, error: null }))

    try {
      const response = await fetch('/api/user/email-token')
      const data = await response.json()

      if (response.ok && data.provider) {
        setEmailConnection({
          isChecking: false,
          isConnected: true,
          provider: data.provider,
          email: data.email,
          error: null
        })
      } else {
        setEmailConnection({
          isChecking: false,
          isConnected: false,
          provider: null,
          email: null,
          error: data.error === 'no_email_connected' ? null : data.error
        })
      }
    } catch {
      setEmailConnection({
        isChecking: false,
        isConnected: false,
        provider: null,
        email: null,
        error: 'Failed to check email connection'
      })
    }
  }

  const handleFileSelect = (selectedFiles: FileList | null, category: FileCategory) => {
    if (!selectedFiles || selectedFiles.length === 0) return

    const file = selectedFiles[0]

    setCategoryFiles(prev => ({
      ...prev,
      [category]: {
        file,
        preview: { name: file.name, size: file.size, type: file.type },
        isDragging: false
      }
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
    setCategoryFiles(prev => ({
      ...prev,
      [category]: { file: null, preview: null, isDragging: false }
    }))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmedTag = tagInput.trim()
      if (trimmedTag && !tags.includes(trimmedTag)) {
        setTags([...tags, trimmedTag])
        setTagInput("")
      }
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || isSubmitting || !emailConnection.isConnected) return

    setIsSubmitting(true)

    try {
      // Collect actual File objects
      const files: File[] = Object.values(categoryFiles)
        .map(cf => cf.file)
        .filter((f): f is File => f !== null)

      // Create the project first
      const project = await createProject(name.trim(), description.trim(), companyAddress.trim(), tags, files)

      setCreatedProjectId(project.id)

      // Start the indexing process
      await startIndexing(project.id, project.name)

      // Show indexing modal
      setShowIndexingModal(true)

      // Reset form
      setName("")
      setDescription("")
      setCompanyAddress("")
      setTags([])
      setTagInput("")
      setCategoryFiles({
        construction: { file: null, preview: null, isDragging: false },
        architectural: { file: null, preview: null, isDragging: false },
        other: { file: null, preview: null, isDragging: false },
      })

    } catch (error) {
      console.error("Failed to create project:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseIndexingModal = () => {
    setShowIndexingModal(false)
    onClose()
    if (createdProjectId && indexingStates[createdProjectId]?.status === 'completed') {
      router.push(`/project/${createdProjectId}`)
    }
  }

  const handleContinueInBackground = () => {
    setShowIndexingModal(false)
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
    const { preview, isDragging } = categoryFiles[category]

    return (
      <div className="flex-1">
        <label className="block text-xs font-medium text-foreground mb-1.5">
          {config.label}
        </label>
        {preview ? (
          <div className="border border-border rounded-lg p-3 bg-[#1f2121]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <File className="w-4 h-4 text-accent flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{preview.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(preview.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(category)}
                className="p-1 hover:bg-[#1e293b] rounded transition-colors flex-shrink-0"
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

  // Get the current indexing state for the created project
  const currentIndexingState = createdProjectId ? indexingStates[createdProjectId] : null

  return (
    <>
      <AnimatePresence>
        {isOpen && !showIndexingModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50"
              style={{
                paddingTop: 'env(safe-area-inset-top, 0px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                paddingLeft: 'env(safe-area-inset-left, 0px)',
                paddingRight: 'env(safe-area-inset-right, 0px)',
              }}
              onClick={onClose}
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] bg-[#111827] border border-border rounded-xl shadow-2xl z-50 flex flex-col safe-area-all"
              style={{
                paddingTop: 'env(safe-area-inset-top, 0px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                paddingLeft: 'env(safe-area-inset-left, 0px)',
                paddingRight: 'env(safe-area-inset-right, 0px)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
                <h2 className="text-lg font-semibold text-foreground">New Project</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#1e293b] transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Email Connection Warning */}
              {!emailConnection.isChecking && !emailConnection.isConnected && (
                <div className="mx-4 mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-400">Email connection required</p>
                      <p className="text-xs text-amber-400/80 mt-1">
                        Connect your Gmail or Outlook account to enable AI-powered email indexing for your project.
                      </p>
                      <Button
                        onClick={() => {
                          onClose()
                          router.push('/account')
                        }}
                        size="sm"
                        className="mt-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Connect Email
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Email Connected Badge */}
              {!emailConnection.isChecking && emailConnection.isConnected && (
                <div className="mx-4 mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-400">
                      {emailConnection.provider === 'gmail' ? 'Gmail' : 'Outlook'} Connected
                    </p>
                    <p className="text-xs text-green-400/70">{emailConnection.email}</p>
                  </div>
                </div>
              )}

              {/* Loading state */}
              {emailConnection.isChecking && (
                <div className="mx-4 mt-4 p-4 bg-muted/20 rounded-lg flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                  <span className="text-sm text-muted-foreground">Checking email connection...</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
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
                    className="w-full px-3 py-2 bg-[#1f2121] border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-smooth"
                    required
                    disabled={!emailConnection.isConnected}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Emails related to this project will be automatically indexed
                  </p>
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
                    className="w-full px-3 py-2 bg-[#1f2121] border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none transition-smooth"
                    disabled={!emailConnection.isConnected}
                  />
                </div>
                {/* Company Address */}
                <div>
                  <label htmlFor="companyAddress" className="block text-sm font-medium text-foreground mb-2">
                    Company Address
                    <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                  </label>
                  <input
                    id="companyAddress"
                    type="text"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="Enter company address..."
                    className="w-full px-3 py-2 bg-[#1f2121] border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-smooth"
                    disabled={!emailConnection.isConnected}
                  />
                </div>
                {/* Tags */}
                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-foreground mb-2">
                    Tags
                    <span className="text-muted-foreground font-normal ml-1">(press Enter to add)</span>
                  </label>
                  <input
                    id="tags"
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Type a tag and press Enter..."
                    className="w-full px-3 py-2 bg-[#1f2121] border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-smooth"
                    disabled={!emailConnection.isConnected}
                  />
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-accent/20 text-accent text-sm rounded-md animate-fade-in"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-red-400 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {/* File Upload - 3 Categories */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Upload Files
                    <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                  </label>
                  <div className={`grid grid-cols-3 gap-3 ${!emailConnection.isConnected ? 'opacity-50 pointer-events-none' : ''}`}>
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
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="bg-transparent border-border hover:bg-[#1e293b]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!name.trim() || isSubmitting || !emailConnection.isConnected}
                    className="bg-accent hover:bg-accent-strong text-background transition-smooth"
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Creating...
                      </>
                    ) : (
                      "Create Project"
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Indexing Modal */}
      <ProjectIndexingModal
        isOpen={showIndexingModal}
        onClose={handleCloseIndexingModal}
        onContinueInBackground={handleContinueInBackground}
        indexingState={currentIndexingState}
        projectId={createdProjectId || undefined}
      />
    </>
  )
}
