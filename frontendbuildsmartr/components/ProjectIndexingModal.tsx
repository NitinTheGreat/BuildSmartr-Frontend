"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Mail, MessageSquare, FileText, CheckCircle2, AlertCircle, Sparkles, Ban, Loader2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ProjectIndexingState } from "@/types/project"
import { useRouter } from "next/navigation"
import { useIndexing } from "@/contexts/IndexingContext"

interface ProjectIndexingModalProps {
    isOpen: boolean
    onClose: () => void
    onContinueInBackground: () => void
    indexingState: ProjectIndexingState | null
    projectId?: string
}

export function ProjectIndexingModal({
    isOpen,
    onClose,
    onContinueInBackground,
    indexingState,
    projectId
}: ProjectIndexingModalProps) {
    const [showConfetti, setShowConfetti] = useState(false)
    const router = useRouter()
    const { cancelIndexing } = useIndexing()

    // Trigger confetti on completion
    useEffect(() => {
        if (indexingState?.status === 'completed') {
            setShowConfetti(true)
            const timer = setTimeout(() => setShowConfetti(false), 3000)
            return () => clearTimeout(timer)
        }
    }, [indexingState?.status])

    const isCompleted = indexingState?.status === 'completed'
    const isError = indexingState?.status === 'error'
    const isCancelling = indexingState?.status === 'cancelling'
    const isCancelled = indexingState?.status === 'cancelled'
    const isIndexing = indexingState?.status === 'indexing' || indexingState?.status === 'vectorizing' || indexingState?.status === 'pending'
    const percent = Math.round(indexingState?.percent || 0)
    const step = indexingState?.currentStep || 'Initializing...'
    const stats = indexingState?.stats
    
    // Check if project is empty (no data found)
    const isEmpty = isCompleted && stats && 
        (stats.thread_count || 0) === 0 && 
        (stats.message_count || 0) === 0 && 
        (stats.pdf_count || 0) === 0

    const handleCancelSync = async () => {
        if (indexingState?.projectId) {
            await cancelIndexing(indexingState.projectId)
        }
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
                        className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
                        onClick={onContinueInBackground}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                        {/* Confetti Effect */}
                        {showConfetti && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 pointer-events-none overflow-hidden"
                            >
                                {[...Array(20)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{
                                            y: -20,
                                            x: Math.random() * 400 - 200,
                                            rotate: 0,
                                            opacity: 1
                                        }}
                                        animate={{
                                            y: 500,
                                            x: Math.random() * 400 - 200,
                                            rotate: 360,
                                            opacity: 0
                                        }}
                                        transition={{
                                            duration: 2 + Math.random(),
                                            delay: Math.random() * 0.5,
                                            ease: "easeOut"
                                        }}
                                        className="absolute w-2 h-2 rounded-full"
                                        style={{
                                            left: '50%',
                                            backgroundColor: ['#00e0ff', '#7cf3ff', '#00ff88', '#ff6b6b', '#ffd93d'][Math.floor(Math.random() * 5)]
                                        }}
                                    />
                                ))}
                            </motion.div>
                        )}

                        {/* Glow effect at top */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50" />

                        {/* Header */}
                        <div className="flex items-center justify-between p-6 pb-4">
                            <div className="flex items-center gap-3">
                                {isEmpty ? (
                                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                        <AlertCircle className="w-5 h-5 text-amber-400" />
                                    </div>
                                ) : isCompleted ? (
                                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                                    </div>
                                ) : isError ? (
                                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                                        <AlertCircle className="w-5 h-5 text-red-400" />
                                    </div>
                                ) : isCancelling ? (
                                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                        <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                                    </div>
                                ) : isCancelled ? (
                                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                        <XCircle className="w-5 h-5 text-amber-400" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center animate-pulse-ring">
                                        <Sparkles className="w-5 h-5 text-accent" />
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground">
                                        {isEmpty ? 'No Emails Found' : isCompleted ? 'Project Ready!' : isError ? 'Something went wrong' : isCancelling ? 'Cancelling...' : isCancelled ? 'Sync Cancelled' : 'Creating Project'}
                                    </h2>
                                    <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                        {indexingState?.projectName}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onContinueInBackground}
                                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/50 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="px-6 pb-6">
                            {/* Cancelled Message */}
                            {isCancelled && (
                                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                    <p className="text-sm text-amber-400">Sync was cancelled. You can start a new sync from the project page.</p>
                                </div>
                            )}

                            {/* Progress Bar */}
                            {!isError && !isCancelled && (
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-muted-foreground">{step}</span>
                                        <span className="text-sm font-medium text-accent">{percent}%</span>
                                    </div>
                                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percent}%` }}
                                            transition={{ duration: 0.5, ease: "easeOut" }}
                                            className="h-full rounded-full relative"
                                            style={{
                                                background: isCompleted
                                                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                                                    : 'linear-gradient(90deg, var(--accent), var(--accent-strong))'
                                            }}
                                        >
                                            {/* Animated glow */}
                                            {!isCompleted && (
                                                <motion.div
                                                    animate={{ x: ['-100%', '200%'] }}
                                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                                />
                                            )}
                                        </motion.div>
                                    </div>
                                </div>
                            )}

                            {/* Error Message */}
                            {isError && (
                                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                                    <p className="text-sm text-red-400">{indexingState?.error || 'An unexpected error occurred'}</p>
                                </div>
                            )}

                            {/* Empty Project Warning */}
                            {isEmpty && (
                                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                    <p className="text-sm text-amber-400">
                                        No emails were found matching &quot;{indexingState?.projectName}&quot;. 
                                        Try a different project name that matches your email subjects or contacts.
                                    </p>
                                </div>
                            )}

                            {/* Stats */}
                            {(stats || isCompleted) && !isError && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="grid grid-cols-3 gap-3 mb-6"
                                >
                                    <div className="bg-muted/20 rounded-lg p-3 text-center">
                                        <div className="flex items-center justify-center mb-1">
                                            <MessageSquare className="w-4 h-4 text-accent" />
                                        </div>
                                        <p className="text-lg font-semibold text-foreground">
                                            {stats?.thread_count || 0}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Conversations</p>
                                    </div>
                                    <div className="bg-muted/20 rounded-lg p-3 text-center">
                                        <div className="flex items-center justify-center mb-1">
                                            <Mail className="w-4 h-4 text-accent" />
                                        </div>
                                        <p className="text-lg font-semibold text-foreground">
                                            {stats?.message_count || 0}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Messages</p>
                                    </div>
                                    <div className="bg-muted/20 rounded-lg p-3 text-center">
                                        <div className="flex items-center justify-center mb-1">
                                            <FileText className="w-4 h-4 text-accent" />
                                        </div>
                                        <p className="text-lg font-semibold text-foreground">
                                            {stats?.pdf_count || 0}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Documents</p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3">
                                {isEmpty ? (
                                    <>
                                        <Button
                                            onClick={onClose}
                                            variant="outline"
                                            className="flex-1 border-border hover:bg-muted/30"
                                        >
                                            Close
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                onClose()
                                                if (projectId) {
                                                    router.push(`/project/${projectId}`)
                                                }
                                            }}
                                            variant="outline"
                                            className="flex-1 border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500"
                                        >
                                            View Anyway
                                        </Button>
                                    </>
                                ) : isCompleted ? (
                                    <Button
                                        onClick={() => {
                                            onClose()
                                            if (projectId) {
                                                router.push(`/project/${projectId}`)
                                            }
                                        }}
                                        className="flex-1 bg-accent hover:bg-accent-strong text-background font-medium"
                                    >
                                        Open Project
                                    </Button>
                                ) : isError ? (
                                    <>
                                        <Button
                                            onClick={onClose}
                                            variant="outline"
                                            className="flex-1 border-border hover:bg-muted/30"
                                        >
                                            Close
                                        </Button>
                                        <Button
                                            onClick={() => window.location.reload()}
                                            className="flex-1 bg-accent hover:bg-accent-strong text-background font-medium"
                                        >
                                            Try Again
                                        </Button>
                                    </>
                                ) : isCancelled ? (
                                    <Button
                                        onClick={onClose}
                                        variant="outline"
                                        className="flex-1 border-border hover:bg-muted/30"
                                    >
                                        Close
                                    </Button>
                                ) : isCancelling ? (
                                    <Button
                                        variant="outline"
                                        disabled
                                        className="flex-1 border-border"
                                    >
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Cancelling...
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            onClick={handleCancelSync}
                                            variant="outline"
                                            className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500"
                                        >
                                            <Ban className="w-4 h-4 mr-2" />
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={onContinueInBackground}
                                            variant="outline"
                                            className="flex-1 border-border hover:bg-muted/30"
                                        >
                                            Continue in background
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
