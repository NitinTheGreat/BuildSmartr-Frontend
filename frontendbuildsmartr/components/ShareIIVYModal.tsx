"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Share2, Mail, MessageCircle, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ShareIIVYModalProps {
  isOpen: boolean
  onClose: () => void
  userName?: string | null
}

export function ShareIIVYModal({ isOpen, onClose, userName }: ShareIIVYModalProps) {
  const [copied, setCopied] = useState(false)
  
  // The share URL - you can update this to your production URL
  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}` 
    : 'https://iivy.app'
  
  const shareMessage = userName 
    ? `${userName} is inviting you to try IIVY - an AI-powered research assistant for smarter building decisions!`
    : `You're invited to try IIVY - an AI-powered research assistant for smarter building decisions!`
  
  const fullMessage = `${shareMessage}\n\nSign up here: ${shareUrl}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`${userName || 'Your friend'} invited you to try IIVY`)
    const body = encodeURIComponent(fullMessage)
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  }

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(fullMessage)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-[#1f2121] border border-border rounded-xl w-full max-w-md shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Share2 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Share IIVY</h2>
                <p className="text-sm text-muted-foreground">Invite your friends & colleagues</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#3c3f45] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Preview message */}
            <div className="bg-[#2b2d31] rounded-lg p-4 border border-border">
              <p className="text-sm text-muted-foreground mb-2">Your invite message:</p>
              <p className="text-sm text-foreground">{shareMessage}</p>
            </div>

            {/* Share options */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Share via</p>
              
              {/* Email */}
              <button
                onClick={handleEmailShare}
                className="w-full flex items-center gap-4 p-4 bg-[#2b2d31] hover:bg-[#3c3f45] rounded-lg border border-border transition-colors"
              >
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">Email</p>
                  <p className="text-sm text-muted-foreground">Send invite via email</p>
                </div>
              </button>

              {/* WhatsApp */}
              <button
                onClick={handleWhatsAppShare}
                className="w-full flex items-center gap-4 p-4 bg-[#2b2d31] hover:bg-[#3c3f45] rounded-lg border border-border transition-colors"
              >
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">WhatsApp</p>
                  <p className="text-sm text-muted-foreground">Share via WhatsApp</p>
                </div>
              </button>
            </div>

            {/* Copy link */}
            <div className="pt-2 border-t border-border">
              <p className="text-sm font-medium text-foreground mb-2">Or copy link</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-[#2b2d31] border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground truncate">
                  {shareUrl}
                </div>
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="bg-transparent border-border hover:bg-[#3c3f45] gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Help us grow by sharing IIVY with your network! 🚀
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
