import type React from "react"
import type { Metadata, Viewport } from "next"
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

export const viewport: Viewport = {
  themeColor: "#1f2121",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  title: "IIVY",
  description: "AI-powered research assistant for smarter building decisions.",
  generator: "Next.js",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IIVY",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
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
          {user && <TopBar userName={firstName || fullName} />}
          <div className={user ? "ml-0 md:ml-20 transition-all duration-300" : ""}>{children}</div>
        </ProjectProvider>
        {/* <Analytics /> */}
      </body>
    </html>
  )
}
