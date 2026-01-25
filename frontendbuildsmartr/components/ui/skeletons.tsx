"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

// Base skeleton component with shimmer animation
export function Skeleton({
    className = "",
    variant = "default"
}: {
    className?: string
    variant?: "default" | "circular" | "rounded"
}) {
    const baseClasses = "bg-[#111827] relative overflow-hidden"
    const variantClasses = {
        default: "rounded",
        circular: "rounded-full",
        rounded: "rounded-xl"
    }

    return (
        <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
            <motion.div
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#1e293b]/50 to-transparent"
                animate={{ translateX: ["100%", "100%"] }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                    repeatDelay: 0.5
                }}
                style={{ translateX: "-100%" }}
            />
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-[#1e293b]/30 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
        </div>
    )
}

// Skeleton for text lines
export function SkeletonText({ lines = 1, className = "" }: { lines?: number; className?: string }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
                />
            ))}
        </div>
    )
}

// Skeleton for avatar/profile images
export function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" | "xl" }) {
    const sizeClasses = {
        sm: "w-8 h-8",
        md: "w-12 h-12",
        lg: "w-16 h-16",
        xl: "w-24 h-24"
    }
    return <Skeleton variant="circular" className={sizeClasses[size]} />
}

// Skeleton for cards
export function SkeletonCard({ className = "" }: { className?: string }) {
    return (
        <div className={`bg-surface border border-border rounded-xl p-5 ${className}`}>
            <div className="flex items-start gap-4">
                <Skeleton variant="rounded" className="w-12 h-12 shrink-0" />
                <div className="flex-1 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            </div>
        </div>
    )
}

// Skeleton for project tiles on homepage
export function SkeletonProjectTile() {
    return (
        <motion.div
            className="flex flex-col p-5 bg-surface border border-border rounded-xl min-h-[140px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="flex items-center gap-3 mb-3">
                <Skeleton variant="rounded" className="w-10 h-10 shrink-0" />
                <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
        </motion.div>
    )
}

// Homepage skeleton with dynamic loading messages
export function HomepageSkeleton() {
    const [messageIndex, setMessageIndex] = useState(0)
    const [progress, setProgress] = useState(0)
    const messages = [
        { text: "Preparing your workspace...", icon: "🔗" },
        { text: "Gathering project data...", icon: "📊" },
        { text: "Organizing insights...", icon: "⚡" },
        { text: "Almost ready...", icon: "✨" },
    ]

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % messages.length)
        }, 1800)
        return () => clearInterval(interval)
    }, [messages.length])

    useEffect(() => {
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 90) return prev
                return prev + Math.random() * 12
            })
        }, 400)
        return () => clearInterval(progressInterval)
    }, [])

    return (
        <motion.div
            className="flex flex-col items-center justify-center min-h-screen p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <div className="text-center mb-8">
                {/* Animated logo placeholder */}
                <motion.div
                    className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center relative"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                    <motion.div
                        className="w-10 h-10 rounded-xl bg-accent/30"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    />
                    {/* Glow effect */}
                    <motion.div
                        className="absolute inset-0 rounded-2xl"
                        animate={{
                            boxShadow: [
                                "0 0 0 0 rgba(34, 197, 94, 0)",
                                "0 0 25px 8px rgba(34, 197, 94, 0.12)",
                                "0 0 0 0 rgba(34, 197, 94, 0)",
                            ],
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                </motion.div>

                {/* Brand name */}
                <motion.h1
                    className="text-2xl font-bold mb-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <span className="bg-gradient-to-r from-accent to-accent-strong bg-clip-text text-transparent">
                        IIVY
                    </span>
                </motion.h1>

                {/* Dynamic message */}
                <div className="h-8 flex items-center justify-center mb-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={messageIndex}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                            className="flex items-center gap-2 text-muted-foreground"
                        >
                            <span className="text-lg">{messages[messageIndex].icon}</span>
                            <span className="text-sm font-medium">{messages[messageIndex].text}</span>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Progress bar */}
                <div className="w-56 mx-auto mb-6">
                    <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-strong"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                    </div>
                </div>

                {/* Loading dots */}
                <div className="flex justify-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="w-2 h-2 rounded-full bg-accent"
                            animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
                            transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                delay: i * 0.15,
                                ease: "easeInOut",
                            }}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    )
}

// Project page skeleton with dynamic loading
export function ProjectSkeleton() {
    const [messageIndex, setMessageIndex] = useState(0)
    const [progress, setProgress] = useState(0)
    const messages = [
        { text: "Loading project details...", icon: "📁" },
        { text: "Fetching your files...", icon: "📄" },
        { text: "Preparing chat history...", icon: "💬" },
        { text: "Almost ready...", icon: "✨" },
    ]

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % messages.length)
        }, 1500)
        return () => clearInterval(interval)
    }, [messages.length])

    useEffect(() => {
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 90) return prev
                return prev + Math.random() * 15
            })
        }, 350)
        return () => clearInterval(progressInterval)
    }, [])

    return (
        <motion.div
            className="min-h-screen flex flex-col items-center justify-center p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <div className="text-center">
                {/* Animated folder icon */}
                <motion.div
                    className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center relative"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                    <motion.svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        className="w-8 h-8 text-accent"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                    </motion.svg>
                    {/* Glow effect */}
                    <motion.div
                        className="absolute inset-0 rounded-2xl"
                        animate={{
                            boxShadow: [
                                "0 0 0 0 rgba(34, 197, 94, 0)",
                                "0 0 20px 6px rgba(34, 197, 94, 0.1)",
                                "0 0 0 0 rgba(34, 197, 94, 0)",
                            ],
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                </motion.div>

                {/* Dynamic message */}
                <div className="h-8 flex items-center justify-center mb-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={messageIndex}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                            className="flex items-center gap-2 text-muted-foreground"
                        >
                            <span className="text-lg">{messages[messageIndex].icon}</span>
                            <span className="text-sm font-medium">{messages[messageIndex].text}</span>
                        </motion.div>
                    </AnimatePresence>
            </div>

                {/* Progress bar */}
                <div className="w-48 mx-auto mb-6">
                    <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-strong"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                </div>
            </div>

                {/* Loading dots */}
                <div className="flex justify-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="w-2 h-2 rounded-full bg-accent"
                            animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
                            transition={{
                                duration: 0.7,
                                repeat: Infinity,
                                delay: i * 0.12,
                                ease: "easeInOut",
                            }}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    )
}

// Chat view skeleton
export function ChatSkeleton() {
    return (
        <motion.div
            className="min-h-screen flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Skeleton variant="circular" className="w-8 h-8" />
                        <Skeleton className="h-5 w-32" />
                    </div>
                    <Skeleton variant="rounded" className="h-8 w-24" />
                </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                    {/* User message skeleton */}
                    <div className="flex justify-end">
                        <Skeleton variant="rounded" className="h-16 w-64" />
                    </div>

                    {/* Assistant message skeleton */}
                    <div className="flex justify-start">
                        <div className="max-w-[80%] space-y-2">
                            <Skeleton variant="rounded" className="h-24 w-80" />
                        </div>
                    </div>

                    {/* Another user message */}
                    <div className="flex justify-end">
                        <Skeleton variant="rounded" className="h-12 w-48" />
                    </div>

                    {/* Loading indicator */}
                    <div className="flex justify-start">
                        <div className="flex items-center gap-3 px-4 py-3 bg-[#111827] rounded-2xl">
                            <div className="flex gap-1">
                                {[0, 1, 2].map((i) => (
                                    <motion.div
                                        key={i}
                                        className="w-2 h-2 bg-accent rounded-full"
                                        animate={{ y: [0, -6, 0] }}
                                        transition={{
                                            duration: 0.6,
                                            repeat: Infinity,
                                            delay: i * 0.15
                                        }}
                                    />
                                ))}
                            </div>
                            <span className="text-sm text-muted-foreground">Thinking...</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Input at bottom */}
            <div className="sticky bottom-0 bg-background border-t border-border">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <div className="bg-surface rounded-xl border border-border p-3">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-6 flex-1" />
                            <Skeleton variant="circular" className="w-8 h-8" />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

// Account page skeleton
export function AccountSkeleton() {
    return (
        <motion.div
            className="min-h-screen bg-background p-4 sm:p-6 md:p-8 pt-16 md:pt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <div className="max-w-2xl mx-auto">
                {/* Title */}
                <Skeleton className="h-8 w-32 mb-8" />

                {/* Profile Card */}
                <div className="bg-surface border border-border rounded-xl p-6 mb-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
                        <SkeletonAvatar size="xl" />
                        <div className="flex-1 text-center sm:text-left space-y-3">
                            <Skeleton className="h-6 w-40 mx-auto sm:mx-0" />
                            <Skeleton className="h-4 w-48 mx-auto sm:mx-0" />
                            <div className="flex gap-2 justify-center sm:justify-start">
                                <Skeleton variant="rounded" className="h-6 w-16" />
                                <Skeleton variant="rounded" className="h-6 w-16" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Details Card */}
                <div className="bg-surface border border-border rounded-xl p-6 mb-6">
                    <Skeleton className="h-5 w-32 mb-4" />
                    <div className="space-y-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <motion.div
                                key={i}
                                className="flex flex-col sm:flex-row sm:items-center gap-2"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05, duration: 0.3 }}
                            >
                                <Skeleton className="h-4 w-24 shrink-0" />
                                <Skeleton className="h-4 flex-1 max-w-xs" />
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Company Info Card */}
                <div className="bg-surface border border-border rounded-xl p-6 mb-6">
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-4 w-64 mb-4" />
                    <Skeleton variant="rounded" className="h-24 w-full" />
                </div>

                {/* Connect Email Card */}
                <div className="bg-surface border border-border rounded-xl p-6">
                    <Skeleton className="h-5 w-44 mb-4" />
                    <Skeleton className="h-4 w-72 mb-4" />
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Skeleton variant="rounded" className="h-12 flex-1" />
                        <Skeleton variant="rounded" className="h-12 flex-1" />
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

// Empty state skeleton with animated pulse
export function EmptyStateSkeleton() {
    return (
        <motion.div
            className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
        >
            <motion.div
                className="w-24 h-24 bg-[#111827] rounded-2xl mb-6 flex items-center justify-center"
                animate={{
                    boxShadow: [
                        "0 0 0 0 rgba(34, 197, 94, 0)",
                        "0 0 0 20px rgba(34, 197, 94, 0.1)",
                        "0 0 0 0 rgba(34, 197, 94, 0)"
                    ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                <Skeleton variant="rounded" className="w-12 h-12" />
            </motion.div>
            <Skeleton className="h-6 w-48 mb-3" />
            <Skeleton className="h-4 w-64 mb-6" />
            <Skeleton variant="rounded" className="h-10 w-32" />
        </motion.div>
    )
}
