"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  variant?: "default" | "dots" | "pulse" | "bars"
  className?: string
  label?: string
}

const sizeClasses = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
}

const borderSizes = {
  xs: "border",
  sm: "border-2",
  md: "border-2",
  lg: "border-[3px]",
  xl: "border-4",
}

export function Spinner({ 
  size = "md", 
  variant = "default", 
  className,
  label 
}: SpinnerProps) {
  if (variant === "dots") {
    return (
      <div className={cn("flex items-center gap-1", className)} role="status" aria-label={label || "Loading"}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={cn(
              "rounded-full bg-accent",
              size === "xs" && "w-1 h-1",
              size === "sm" && "w-1.5 h-1.5",
              size === "md" && "w-2 h-2",
              size === "lg" && "w-2.5 h-2.5",
              size === "xl" && "w-3 h-3"
            )}
            animate={{
              y: [0, -6, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
        {label && <span className="sr-only">{label}</span>}
      </div>
    )
  }

  if (variant === "pulse") {
    return (
      <div className={cn("relative", sizeClasses[size], className)} role="status" aria-label={label || "Loading"}>
        <motion.div
          className="absolute inset-0 rounded-full bg-accent"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.6, 0, 0.6],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <div className="absolute inset-0 rounded-full bg-accent" />
        {label && <span className="sr-only">{label}</span>}
      </div>
    )
  }

  if (variant === "bars") {
    return (
      <div className={cn("flex items-end gap-0.5", className)} role="status" aria-label={label || "Loading"}>
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className={cn(
              "bg-accent rounded-sm",
              size === "xs" && "w-0.5",
              size === "sm" && "w-1",
              size === "md" && "w-1",
              size === "lg" && "w-1.5",
              size === "xl" && "w-2"
            )}
            animate={{
              height: [
                size === "xs" ? 4 : size === "sm" ? 8 : size === "md" ? 12 : size === "lg" ? 16 : 24,
                size === "xs" ? 8 : size === "sm" ? 16 : size === "md" ? 24 : size === "lg" ? 32 : 48,
                size === "xs" ? 4 : size === "sm" ? 8 : size === "md" ? 12 : size === "lg" ? 16 : 24,
              ],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut",
            }}
          />
        ))}
        {label && <span className="sr-only">{label}</span>}
      </div>
    )
  }

  // Default spinner
  return (
    <div
      className={cn(
        sizeClasses[size],
        borderSizes[size],
        "rounded-full border-accent border-t-transparent animate-spin",
        className
      )}
      role="status"
      aria-label={label || "Loading"}
    >
      {label && <span className="sr-only">{label}</span>}
    </div>
  )
}

// Full page loading overlay
interface LoadingOverlayProps {
  isVisible: boolean
  message?: string
  variant?: SpinnerProps["variant"]
}

export function LoadingOverlay({ isVisible, message, variant = "default" }: LoadingOverlayProps) {
  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="flex flex-col items-center gap-4"
      >
        <Spinner size="xl" variant={variant} />
        {message && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-muted-foreground"
          >
            {message}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  )
}

// Skeleton loader for content placeholders
interface SkeletonProps {
  className?: string
  variant?: "text" | "circular" | "rectangular"
  width?: string | number
  height?: string | number
  lines?: number
}

export function Skeleton({ 
  className, 
  variant = "rectangular",
  width,
  height,
  lines = 1
}: SkeletonProps) {
  const baseStyles = "animate-shimmer"
  
  if (variant === "circular") {
    return (
      <div
        className={cn(baseStyles, "rounded-full", className)}
        style={{ width, height }}
      />
    )
  }

  if (variant === "text" && lines > 1) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              baseStyles,
              "h-4 rounded",
              i === lines - 1 && "w-3/4" // Last line is shorter
            )}
            style={{ width: i === lines - 1 ? "75%" : width }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        baseStyles,
        variant === "text" ? "h-4 rounded" : "rounded-lg",
        className
      )}
      style={{ width, height }}
    />
  )
}

// Button with loading state
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  loadingText?: string
  spinnerSize?: SpinnerProps["size"]
  spinnerVariant?: SpinnerProps["variant"]
  children: React.ReactNode
}

export function LoadingButton({
  isLoading,
  loadingText,
  spinnerSize = "sm",
  spinnerVariant = "default",
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <button
      disabled={isLoading || disabled}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 transition-all",
        isLoading && "cursor-not-allowed",
        className
      )}
      {...props}
    >
      {isLoading && (
        <Spinner size={spinnerSize} variant={spinnerVariant} className="absolute" />
      )}
      <span className={cn(isLoading && "opacity-0")}>{children}</span>
      {isLoading && loadingText && (
        <span className="absolute text-sm">{loadingText}</span>
      )}
    </button>
  )
}
