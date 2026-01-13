import { Suspense } from "react"
import { GeneralChatInterface } from "@/components/GeneralChatInterface"
import { Spinner } from "@/components/ui/spinner"

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <Spinner size="lg" variant="dots" />
          <p className="text-sm text-muted-foreground">Loading your chats...</p>
        </div>
      </div>
    }>
      <GeneralChatInterface />
    </Suspense>
  )
}
