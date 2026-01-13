"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, WifiOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface OfflineModalProps {
  isOpen: boolean
  onClose: () => void
  onRetry?: () => void
  message?: string
}

export function OfflineModal({ 
  isOpen, 
  onClose, 
  onRetry,
  message = "Unable to connect to the server. Please check your internet connection."
}: OfflineModalProps) {
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
          className="bg-[#1f2121] border border-border rounded-xl w-full max-w-sm shadow-xl safe-area-all"
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
              <div className="p-2 bg-red-500/10 rounded-lg">
                <WifiOff className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Connection Error</h2>
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
            <p className="text-sm text-muted-foreground">{message}</p>
            
            <div className="flex gap-2">
              {onRetry && (
                <Button
                  onClick={() => {
                    onRetry()
                    onClose()
                  }}
                  className="flex-1 bg-accent hover:bg-accent-strong text-background gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </Button>
              )}
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 bg-transparent border-border hover:bg-[#3c3f45]"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
