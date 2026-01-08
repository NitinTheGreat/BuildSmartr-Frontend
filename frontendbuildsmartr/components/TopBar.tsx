"use client"

import { useState } from "react"
import { Share2 } from "lucide-react"
import { ShareIIVYModal } from "./ShareIIVYModal"

interface TopBarProps {
  userName?: string | null
}

export function TopBar({ userName }: TopBarProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-full text-accent font-medium text-sm transition-colors"
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Share IIVY</span>
        </button>
      </div>

      <ShareIIVYModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        userName={userName}
      />
    </>
  )
}
