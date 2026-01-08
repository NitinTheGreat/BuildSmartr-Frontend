import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
// import { Analytics } from "@vercel/analytics/next"
import { Sidebar } from "@/components/Sidebar"
import { TopBar } from "@/components/TopBar"
import { createClient } from "@/utils/supabase/server"
import { ProjectProvider } from "@/contexts/ProjectContext"
import "./globals.css"

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "IIVY",
  description: "AI-powered research assistant for smarter building decisions.",
  generator: "Next.js",
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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className={`font-sans antialiased`}>
        <ProjectProvider>
          {user && <Sidebar initialAvatarUrl={avatarUrl} initialFirstName={firstName} />}
          <div className={user ? "ml-0 md:ml-20 transition-all duration-300" : ""}>{children}</div>
        </ProjectProvider>
        {/* <Analytics /> */}
      </body>
    </html>
  )
}
