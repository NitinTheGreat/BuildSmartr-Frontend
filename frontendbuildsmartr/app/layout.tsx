import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
// import { Analytics } from "@vercel/analytics/next"
import { Sidebar } from "@/components/Sidebar"
import { createClient } from "@/utils/supabase/server"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const avatarUrl = (user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null) as string | null
  const fullName = (user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null) as string | null
  const firstName = fullName?.split(" ")[0] ?? null

  console.log("[layout] full user object:", JSON.stringify(user, null, 2))
  console.log("[layout] avatarUrl:", avatarUrl)

  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <Sidebar initialAvatarUrl={avatarUrl} initialFirstName={firstName} />
        <div className="ml-0 md:ml-20">{children}</div>
        {/* <Analytics /> */}
      </body>
    </html>
  )
}
