import { Suspense } from "react"
import { GeneralChatInterface } from "@/components/GeneralChatInterface"

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <GeneralChatInterface />
    </Suspense>
  )
}
