import { Suspense } from "react"
import { SearchInterface } from "@/components/SearchInterface"

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Logo */}
      <div className="mb-12">
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="text-foreground">Ivvy</span>
          {/* <span className="text-accent">pro</span> */}
        </h1>
      </div>

      {/* Search Interface */}
      <Suspense fallback={null}>
        <SearchInterface />
      </Suspense>
    </main>
  )
}
