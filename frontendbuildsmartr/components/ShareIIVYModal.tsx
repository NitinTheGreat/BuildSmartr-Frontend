"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Share2, Mail, Copy, Check, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

interface ShareIIVYModalProps {
  isOpen: boolean
  onClose: () => void
  userName?: string | null
}

export function ShareIIVYModal({ isOpen, onClose, userName }: ShareIIVYModalProps) {
  const [copied, setCopied] = useState(false)
  const [emailInput, setEmailInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [sendStatus, setSendStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  
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

  const handleSendEmail = async () => {
    if (!emailInput.trim() || isSending) return

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailInput.trim())) {
      setSendStatus({ type: 'error', message: 'Please enter a valid email address' })
      return
    }

    setIsSending(true)
    setSendStatus(null)

    try {
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim(),
          userName: userName || 'Someone',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite')
      }

      setSendStatus({ type: 'success', message: 'Invite sent successfully!' })
      setEmailInput("")
      setTimeout(() => setSendStatus(null), 3000)
    } catch (err) {
      setSendStatus({ 
        type: 'error', 
        message: err instanceof Error ? err.message : 'Failed to send invite' 
      })
    } finally {
      setIsSending(false)
    }
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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 safe-area-all"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-[#1f2121] border border-border rounded-xl w-full max-w-md shadow-xl safe-area-all"
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)',
          }}
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
              className="p-2 hover:bg-[#1e293b] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Email invite */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400" />
                <p className="text-sm font-medium text-foreground">Invite via Email</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendEmail()}
                  placeholder="Enter email address"
                  className="flex-1 bg-[#111827] border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <Button
                  onClick={handleSendEmail}
                  disabled={!emailInput.trim() || isSending}
                  className="bg-accent hover:bg-accent-strong text-background gap-2 transition-smooth"
                >
                  {isSending ? (
                    <Spinner size="sm" className="mr-2" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send
                </Button>
              </div>
              {sendStatus && (
                <p className={`text-sm ${sendStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {sendStatus.message}
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or share via</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* WhatsApp */}
            <button
              onClick={handleWhatsAppShare}
              className="w-full flex items-center gap-4 p-4 bg-[#111827] hover:bg-[#1e293b] rounded-lg border border-border transition-colors"
            >
              <div className="p-2 bg-[#25D366]/20 rounded-lg">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">WhatsApp</p>
                <p className="text-sm text-muted-foreground">Share via WhatsApp</p>
              </div>
            </button>

            {/* Copy link */}
            <div className="pt-2 border-t border-border">
              <p className="text-sm font-medium text-foreground mb-2">Or copy link</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-[#111827] border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground truncate">
                  {shareUrl}
                </div>
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="bg-transparent border-border hover:bg-[#1e293b] gap-2"
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
