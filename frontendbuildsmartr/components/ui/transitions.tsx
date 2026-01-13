"use client"

import { motion, AnimatePresence, type Variants } from "framer-motion"
import { usePathname } from "next/navigation"
import type { ReactNode, CSSProperties } from "react"

/* ---------------- Page Transition ---------------- */

interface PageTransitionProps {
  children: ReactNode
}

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    } as const, // Added 'as const' to prevent type widening (fixes potential number[] errors)
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
      ease: "easeInOut",
    } as const,
  },
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname() ?? ""

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={pageVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

interface FadeTransitionProps {
  children: ReactNode
  isVisible: boolean
  className?: string
}

export function FadeTransition({
  children,
  isVisible,
  className,
}: FadeTransitionProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------------- Slide Up Transition ---------------- */

interface SlideUpTransitionProps {
  children: ReactNode
  isVisible: boolean
  className?: string
}

export function SlideUpTransition({
  children,
  isVisible,
  className,
}: SlideUpTransitionProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------------- Scale Transition ---------------- */

interface ScaleTransitionProps {
  children: ReactNode
  isVisible: boolean
  className?: string
  origin?: CSSProperties["transformOrigin"]
}

export function ScaleTransition({
  children,
  isVisible,
  className,
  origin = "center",
}: ScaleTransitionProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{ transformOrigin: origin }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------------- Staggered List ---------------- */

interface StaggeredListProps {
  children: ReactNode
  className?: string
  staggerDelay?: number
}

export function StaggeredList({
  children,
  className,
  staggerDelay = 0.05,
}: StaggeredListProps) {
  // Ensure children is an array to map safely
  const items = Array.isArray(children) ? children : [children]

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className={className}
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {items.map((child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}