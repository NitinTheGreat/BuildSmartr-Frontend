"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import logo from "@/public/logo.png"

const loadingSteps = [
  { message: "Connecting to your workspace...", icon: "🔗" },
  { message: "Gathering project insights...", icon: "📊" },
  { message: "Optimizing your experience...", icon: "⚡" },
  { message: "Loading your projects...", icon: "📁" },
  { message: "Almost there...", icon: "✨" },
]

export function ProjectLoadingScreen() {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Cycle through messages
    const messageInterval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % loadingSteps.length)
    }, 2000)

    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev // Cap at 90% until actually done
        return prev + Math.random() * 15
      })
    }, 500)

    return () => {
      clearInterval(messageInterval)
      clearInterval(progressInterval)
    }
  }, [])

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center bg-background px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Logo with pulse animation */}
      <motion.div
        className="relative mb-8"
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
          <Image src={logo} alt="IIVY" width={56} height={56} />
        </div>
        
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-2xl"
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(0, 210, 211, 0)",
              "0 0 30px 10px rgba(0, 210, 211, 0.15)",
              "0 0 0 0 rgba(0, 210, 211, 0)",
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* Brand name */}
      <motion.h1
        className="text-3xl font-bold mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <span className="bg-gradient-to-r from-accent to-accent-strong bg-clip-text text-transparent">
          IIVY
        </span>
      </motion.h1>

      {/* Animated loading message */}
      <div className="h-8 mb-8 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <span className="text-lg">{loadingSteps[currentStep].icon}</span>
            <span className="text-sm font-medium">{loadingSteps[currentStep].message}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="w-64 max-w-full">
        <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-strong"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Floating particles for extra visual interest */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-accent/20"
            style={{
              left: `${15 + i * 15}%`,
            }}
            initial={{
              y: "100vh",
              opacity: 0,
            }}
            animate={{
              y: "-10vh",
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.8,
              ease: "linear",
            }}
          />
        ))}
      </div>
    </motion.div>
  )
}
