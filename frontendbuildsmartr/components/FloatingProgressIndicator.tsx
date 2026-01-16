"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronUp, ChevronDown, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { useIndexing } from "@/contexts/IndexingContext"
import { useRouter } from "next/navigation"

export function FloatingProgressIndicator() {
    const { indexingStates, dismissIndexing, activeIndexingCount } = useIndexing()
    const [isExpanded, setIsExpanded] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const router = useRouter()

    // Get all active or recently completed states
    const activeStates = Object.values(indexingStates).filter(
        s => s.status === 'indexing' || s.status === 'pending' ||
            (s.status === 'completed' && s.completedAt && Date.now() - s.completedAt < 30000) ||
            s.status === 'error'
    )

    if (activeStates.length === 0) return null

    const primaryState = activeStates[0]
    const isCompleted = primaryState.status === 'completed'
    const isError = primaryState.status === 'error'
    const isIndexing = primaryState.status === 'indexing' || primaryState.status === 'pending'

    if (isMinimized) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                className="fixed bottom-6 right-6 z-40"
            >
                <button
                    onClick={() => setIsMinimized(false)}
                    className="relative w-12 h-12 bg-surface border border-border rounded-full shadow-lg flex items-center justify-center hover:bg-muted/30 transition-colors group"
                >
                    {isIndexing && (
                        <>
                            <Loader2 className="w-5 h-5 text-accent animate-spin" />
                            {/* Pulse ring */}
                            <span className="absolute inset-0 rounded-full border-2 border-accent animate-ping opacity-30" />
                        </>
                    )}
                    {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                    {isError && <AlertCircle className="w-5 h-5 text-red-400" />}

                    {/* Badge for multiple */}
                    {activeIndexingCount > 1 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-background text-xs font-bold rounded-full flex items-center justify-center">
                            {activeIndexingCount}
                        </span>
                    )}
                </button>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-40 w-80"
        >
            <div className="bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
                {/* Glow line */}
                <div
                    className="h-0.5"
                    style={{
                        background: isCompleted
                            ? 'linear-gradient(90deg, transparent, #10b981, transparent)'
                            : isError
                                ? 'linear-gradient(90deg, transparent, #ef4444, transparent)'
                                : 'linear-gradient(90deg, transparent, var(--accent), transparent)'
                    }}
                />

                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-border/50">
                    <div className="flex items-center gap-2">
                        {isIndexing && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
                        {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                        {isError && <AlertCircle className="w-4 h-4 text-red-400" />}
                        <span className="text-sm font-medium text-foreground">
                            {isCompleted ? 'Indexing Complete' : isError ? 'Indexing Failed' : 'Indexing in Progress'}
                        </span>
                        {activeStates.length > 1 && (
                            <span className="text-xs bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded">
                                +{activeStates.length - 1}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1 hover:bg-muted/30 rounded transition-colors"
                        >
                            {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            )}
                        </button>
                        <button
                            onClick={() => setIsMinimized(true)}
                            className="p-1 hover:bg-muted/30 rounded transition-colors"
                        >
                            <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Primary project */}
                <div
                    className="p-3 cursor-pointer hover:bg-muted/10 transition-colors"
                    onClick={() => {
                        if (primaryState.projectId) {
                            router.push(`/project/${primaryState.projectId}`)
                        }
                    }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-foreground font-medium truncate max-w-[180px]">
                            {primaryState.projectName}
                        </span>
                        <span className="text-xs text-accent font-medium">{Math.round(primaryState.percent)}%</span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden mb-2">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round(primaryState.percent)}%` }}
                            transition={{ duration: 0.3 }}
                            className="h-full rounded-full relative"
                            style={{
                                background: isCompleted
                                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                                    : isError
                                        ? 'linear-gradient(90deg, #ef4444, #f87171)'
                                        : 'linear-gradient(90deg, var(--accent), var(--accent-strong))'
                            }}
                        >
                            {isIndexing && (
                                <motion.div
                                    animate={{ x: ['-100%', '200%'] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                                />
                            )}
                        </motion.div>
                    </div>

                    <p className="text-xs text-muted-foreground truncate">
                        {primaryState.currentStep}
                    </p>
                </div>

                {/* Expanded list */}
                <AnimatePresence>
                    {isExpanded && activeStates.length > 1 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-border/50"
                        >
                            {activeStates.slice(1).map(state => (
                                <div
                                    key={state.projectId}
                                    className="p-3 border-b border-border/30 last:border-0 cursor-pointer hover:bg-muted/10 transition-colors"
                                    onClick={() => router.push(`/project/${state.projectId}`)}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-foreground truncate max-w-[180px]">
                                            {state.projectName}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">{Math.round(state.percent)}%</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    dismissIndexing(state.projectId)
                                                }}
                                                className="p-0.5 hover:bg-muted/50 rounded"
                                            >
                                                <X className="w-3 h-3 text-muted-foreground" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-accent"
                                            style={{ width: `${Math.round(state.percent)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Actions for completed/error */}
                {(isCompleted || isError) && (
                    <div className="p-3 border-t border-border/50 flex gap-2">
                        <button
                            onClick={() => dismissIndexing(primaryState.projectId)}
                            className="flex-1 text-xs py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Dismiss
                        </button>
                        {isCompleted && (
                            <button
                                onClick={() => router.push(`/project/${primaryState.projectId}`)}
                                className="flex-1 text-xs py-1.5 bg-accent/20 text-accent rounded hover:bg-accent/30 transition-colors font-medium"
                            >
                                Open Project
                            </button>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    )
}
