"use client"

import { motion } from "framer-motion"

// Base skeleton component with shimmer animation
export function Skeleton({
    className = "",
    variant = "default"
}: {
    className?: string
    variant?: "default" | "circular" | "rounded"
}) {
    const baseClasses = "bg-[#2b2d31] relative overflow-hidden"
    const variantClasses = {
        default: "rounded",
        circular: "rounded-full",
        rounded: "rounded-xl"
    }

    return (
        <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
            <motion.div
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#3c3f45]/50 to-transparent"
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
                className="absolute inset-0 bg-gradient-to-r from-transparent via-[#3c3f45]/30 to-transparent"
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

// Homepage skeleton
export function HomepageSkeleton() {
    return (
        <motion.div
            className="flex flex-col items-center justify-start min-h-screen p-4 pt-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <div className="w-full max-w-4xl mx-auto">
                {/* Welcome header skeleton */}
                <div className="text-center mb-12">
                    <Skeleton className="h-10 w-64 mx-auto mb-4" />
                    <Skeleton className="h-5 w-48 mx-auto" />
                </div>

                {/* New Project button skeleton */}
                <div className="flex justify-end mb-6">
                    <Skeleton variant="rounded" className="h-10 w-32" />
                </div>

                {/* Projects grid skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1, duration: 0.4 }}
                        >
                            <SkeletonProjectTile />
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    )
}

// Project page skeleton
export function ProjectSkeleton() {
    return (
        <motion.div
            className="min-h-screen flex flex-col items-center justify-center p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {/* Project header */}
            <div className="mb-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <Skeleton variant="rounded" className="w-8 h-8" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <Skeleton className="h-4 w-64 mx-auto" />
            </div>

            {/* Files section */}
            <div className="w-full max-w-2xl mb-8">
                <div className="flex items-center justify-between mb-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton variant="rounded" className="h-8 w-24" />
                </div>
                <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} variant="rounded" className="h-10 w-32" />
                    ))}
                </div>
            </div>

            {/* Chats section */}
            <div className="w-full max-w-2xl mb-8">
                <div className="flex items-center justify-between mb-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton variant="rounded" className="h-8 w-24" />
                </div>
                <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1, duration: 0.3 }}
                        >
                            <div className="flex items-center justify-between p-3 bg-[#2b2d31] border border-border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Skeleton variant="circular" className="w-5 h-5" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Input skeleton */}
            <div className="w-full max-w-2xl">
                <div className="bg-surface rounded-xl border border-border p-4">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton variant="circular" className="w-10 h-10" />
                    </div>
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
                        <div className="flex items-center gap-3 px-4 py-3 bg-[#2b2d31] rounded-2xl">
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
                className="w-24 h-24 bg-[#2b2d31] rounded-2xl mb-6 flex items-center justify-center"
                animate={{
                    boxShadow: [
                        "0 0 0 0 rgba(0, 210, 211, 0)",
                        "0 0 0 20px rgba(0, 210, 211, 0.1)",
                        "0 0 0 0 rgba(0, 210, 211, 0)"
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
