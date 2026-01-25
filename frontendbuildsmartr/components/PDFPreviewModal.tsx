"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Download, ZoomIn, ZoomOut, RotateCw, Loader2, FileWarning } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ProjectFile } from "@/types/project"

interface PDFPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  file: ProjectFile | null
}

export function PDFPreviewModal({ isOpen, onClose, file }: PDFPreviewModalProps) {
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5))
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)

  const handleDownload = () => {
    if (file?.url) {
      const link = document.createElement("a")
      link.href = file.url
      link.download = file.name
      link.target = "_blank"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  // Reset state when file changes
  const resetState = () => {
    setScale(1)
    setRotation(0)
    setIsLoading(true)
    setHasError(false)
  }

  if (!isOpen || !file) return null

  const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  const isImage = file.type.startsWith("image/")

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col"
        onClick={onClose}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 bg-[#1f2121]/90 border-b border-border"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground truncate max-w-md">
              {file.name}
            </h2>
            <span className="text-sm text-muted-foreground">
              ({(file.size / 1024).toFixed(1)} KB)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-[#111827] rounded-lg p-1">
              <button
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-[#1e293b] rounded transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4 text-muted-foreground" />
              </button>
              <span className="px-2 text-sm text-foreground min-w-[4rem] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-[#1e293b] rounded transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Rotate */}
            <button
              onClick={handleRotate}
              className="p-2 hover:bg-[#1e293b] rounded-lg transition-colors"
              title="Rotate"
            >
              <RotateCw className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Download */}
            {file.url && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="bg-transparent border-border hover:bg-[#1e293b] gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1e293b] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </motion.div>

        {/* Content */}
        <div 
          className="flex-1 overflow-auto flex items-center justify-center p-4"
          onClick={(e) => e.stopPropagation()}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          )}

          {hasError ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <FileWarning className="w-16 h-16 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium text-foreground">Unable to preview file</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This file cannot be displayed in the browser
                </p>
              </div>
              {file.url && (
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="bg-transparent border-border hover:bg-[#1e293b] gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download instead
                </Button>
              )}
            </div>
          ) : isPDF && file.url ? (
            <motion.div
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                transformOrigin: "center center",
              }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="bg-white rounded-lg shadow-xl"
            >
              <iframe
                src={`${file.url}#toolbar=0&navpanes=0`}
                className="w-[800px] h-[600px] rounded-lg"
                onLoad={handleLoad}
                onError={handleError}
                title={file.name}
              />
            </motion.div>
          ) : isImage && file.url ? (
            <motion.img
              src={file.url}
              alt={file.name}
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                transformOrigin: "center center",
              }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
              onLoad={handleLoad}
              onError={handleError}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <FileWarning className="w-16 h-16 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium text-foreground">Preview not available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {file.url 
                    ? "This file type cannot be previewed in the browser" 
                    : "No URL available for this file"}
                </p>
              </div>
              {file.url && (
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="bg-transparent border-border hover:bg-[#1e293b] gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download file
                </Button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
