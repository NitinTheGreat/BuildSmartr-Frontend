import { Spinner } from "@/components/ui/spinner"

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <Spinner size="lg" variant="dots" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading chat...</p>
      </div>
    </div>
  )
}