"use client"

import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

/**
 * Base skeleton element with shimmer animation
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-surface-elevated",
        className
      )}
    />
  )
}

/**
 * Chat message skeleton - mimics alternating user/assistant messages
 */
export function ChatSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* User message - right aligned */}
      <div className="flex justify-end">
        <Skeleton className="h-12 w-3/4 rounded-2xl rounded-br-md" />
      </div>
      
      {/* Assistant message - left aligned */}
      <div className="flex justify-start">
        <Skeleton className="h-20 w-2/3 rounded-2xl rounded-bl-md" />
      </div>
      
      {/* User message */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-1/2 rounded-2xl rounded-br-md" />
      </div>
      
      {/* Assistant message */}
      <div className="flex justify-start">
        <Skeleton className="h-16 w-3/4 rounded-2xl rounded-bl-md" />
      </div>
    </div>
  )
}

/**
 * Project card skeleton for loading state in project lists
 */
export function ProjectCardSkeleton() {
  return (
    <div className="p-4 bg-surface border border-border rounded-xl space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  )
}

/**
 * Chat list skeleton for sidebar or chat lists
 */
export function ChatListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-5 w-5 rounded" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * File list skeleton for project files
 */
export function FileListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-32 rounded-lg" />
      ))}
    </div>
  )
}

/**
 * Full page loading skeleton
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-8 w-48" />
      </div>
      
      {/* Description */}
      <div className="max-w-lg mx-auto space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5 mx-auto" />
      </div>
      
      {/* Content cards */}
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
      
      {/* Input at bottom */}
      <div className="max-w-2xl mx-auto">
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </div>
  )
}

/**
 * Stats skeleton for project indexing stats
 */
export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-4 bg-surface border border-border rounded-lg space-y-2">
          <Skeleton className="h-5 w-5 mx-auto rounded" />
          <Skeleton className="h-6 w-12 mx-auto" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>
      ))}
    </div>
  )
}

/**
 * Inline text skeleton
 */
export function TextSkeleton({ width = "w-24" }: { width?: string }) {
  return <Skeleton className={`h-4 ${width} inline-block`} />
}
