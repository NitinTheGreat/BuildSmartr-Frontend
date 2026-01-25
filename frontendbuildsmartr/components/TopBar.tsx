"use client"

import { useState } from "react"
import { Share2 } from "lucide-react"
import { ShareIIVYModal } from "./ShareIIVYModal"
import { motion } from "framer-motion"

interface TopBarProps {
  userName?: string | null
}

export function TopBar({ userName }: TopBarProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  return (
    <>
      <motion.div 
        className="fixed z-50"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 12px)',
        }}
      >
        <button
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-full text-accent font-medium text-sm transition-all duration-200 backdrop-blur-sm shadow-lg cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Share IIVY</span>
        </button>
      </motion.div>

      <ShareIIVYModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        userName={userName}
      />
    </>
  )
}
