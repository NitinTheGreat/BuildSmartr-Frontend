import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Sidebar } from "@/components/Sidebar"
import { TopBar } from "@/components/TopBar"
import { getUser } from "@/utils/supabase/server"
import { ProjectProvider } from "@/contexts/ProjectContext"
import "./globals.css"
import { Analytics } from "@vercel/analytics/next"

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
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  interactiveWidget: "resizes-visual",
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
    startupImage: [
      {
        url: "/apple-splash-2048-2732.jpg",
        media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        url: "/apple-splash-1170-2532.jpg",
        media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/apple-splash-1284-2778.jpg",
        media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
    ],
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
  // Use cached auth helper (deduplicates calls across the request)
  const { user } = await getUser()

  const avatarUrl = (user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null) as string | null
  const fullName = (user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null) as string | null
  const firstName = fullName?.split(" ")[0] ?? null

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Additional meta tags for iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#1f2121" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#1f2121" media="(prefers-color-scheme: light)" />
      </head>
      <body className="font-sans antialiased safe-area-all scroll-smooth-ios">
        <ProjectProvider>
          {user && <Sidebar initialAvatarUrl={avatarUrl} initialFirstName={firstName} />}
          {user && <TopBar userName={firstName || fullName} />}
          <main className={user ? "ml-0 md:ml-20 transition-all duration-300 ease-out min-h-screen-safe" : "min-h-screen"}>
            {children}
          </main>
        </ProjectProvider>
        <Analytics />
      </body>
    </html>
  )
}
