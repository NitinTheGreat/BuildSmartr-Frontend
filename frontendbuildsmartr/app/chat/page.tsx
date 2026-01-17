import { Suspense } from "react"
import { GeneralChatInterface } from "@/components/GeneralChatInterface"
import { PageSkeleton } from "@/components/Skeleton"

export default function ChatPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GeneralChatInterface />
    </Suspense>
  )
}
