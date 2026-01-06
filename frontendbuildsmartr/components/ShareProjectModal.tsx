"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, UserPlus, Trash2, Mail, Shield, Edit3, Eye, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ProjectShare, SharePermission } from "@/types/project"

interface ShareProjectModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectName: string
}

export function ShareProjectModal({ isOpen, onClose, projectId, projectName }: ShareProjectModalProps) {
  const [email, setEmail] = useState("")
  const [permission, setPermission] = useState<SharePermission>("view")
  const [shares, setShares] = useState<ProjectShare[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load shares when modal opens
  useEffect(() => {
    if (isOpen) {
      loadShares()
    }
  }, [isOpen, projectId])

  const loadShares = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`/api/projects/${projectId}/shares`)
      if (!response.ok) {
        throw new Error("Failed to load shares")
      }
      const data = await response.json()
      setShares(data.map((s: any) => ({
        id: s.id,
        projectId: s.project_id,
        sharedWithEmail: s.shared_with_email,
        permission: s.permission,
        createdAt: new Date(s.created_at),
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shares")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddShare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || isAdding) return

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address")
      return
    }

    try {
      setIsAdding(true)
      setError(null)
      const response = await fetch(`/api/projects/${projectId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          permission,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || data.error || "Failed to add share")
      }

      setEmail("")
      setPermission("view")
      await loadShares()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add share")
    } finally {
      setIsAdding(false)
    }
  }

  const handleUpdatePermission = async (shareId: string, newPermission: SharePermission) => {
    try {
      setError(null)
      const response = await fetch(`/api/projects/${projectId}/shares/${shareId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission: newPermission }),
      })

      if (!response.ok) {
        throw new Error("Failed to update permission")
      }

      setShares(prev => prev.map(s => 
        s.id === shareId ? { ...s, permission: newPermission } : s
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update permission")
    }
  }

  const handleRemoveShare = async (shareId: string) => {
    try {
      setError(null)
      const response = await fetch(`/api/projects/${projectId}/shares/${shareId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to remove share")
      }

      setShares(prev => prev.filter(s => s.id !== shareId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove share")
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-[#1f2121] border border-border rounded-xl w-full max-w-md shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <UserPlus className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Share Project</h2>
                <p className="text-sm text-muted-foreground">{projectName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#3c3f45] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Add new share form */}
            <form onSubmit={handleAddShare} className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full bg-[#2b2d31] border border-border rounded-lg pl-10 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as SharePermission)}
                  className="bg-[#2b2d31] border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="view">View</option>
                  <option value="edit">Edit</option>
                </select>
              </div>
              <Button
                type="submit"
                disabled={!email.trim() || isAdding}
                className="w-full bg-accent hover:bg-accent-strong text-background gap-2"
              >
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Add Collaborator
              </Button>
            </form>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Shared with list */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>People with access</span>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                </div>
              ) : shares.length === 0 ? (
                <div className="text-center py-6 bg-[#2b2d31] rounded-lg border border-dashed border-border">
                  <p className="text-sm text-muted-foreground">
                    No one else has access to this project yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {shares.map((share) => (
                    <motion.div
                      key={share.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 bg-[#2b2d31] rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-accent">
                            {share.sharedWithEmail.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-foreground">{share.sharedWithEmail}</p>
                          <p className="text-xs text-muted-foreground">
                            Added {share.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdatePermission(
                            share.id, 
                            share.permission === "view" ? "edit" : "view"
                          )}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                            share.permission === "edit"
                              ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                              : "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"
                          }`}
                          title={`Click to change to ${share.permission === "view" ? "edit" : "view"}`}
                        >
                          {share.permission === "edit" ? (
                            <>
                              <Edit3 className="w-3 h-3" />
                              Edit
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              View
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleRemoveShare(share.id)}
                          className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                          title="Remove access"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-400" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Collaborators will receive access to this project based on their permission level
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
