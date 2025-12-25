"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Globe, MessageSquare, FileText, History, User, LogOut, Menu, X } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import Image from "next/image"
import logo from "@/public/logo.png"

const navItems = [
  { icon: Mail, label: "Email search", href: "/email-search" },
  { icon: Globe, label: "Web search", href: "/web-search" },
  { icon: MessageSquare, label: "Chat", href: "/chat" },
  { icon: FileText, label: "Quotes", href: "/quotes" },
  { icon: History, label: "History", href: "/history" },
]

type SidebarProps = {
  initialAvatarUrl?: string | null
  initialFirstName?: string | null
}

export function Sidebar({ initialAvatarUrl = null, initialFirstName = null }: SidebarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl)
  const [firstName, setFirstName] = useState<string | null>(initialFirstName)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
  }

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata
      const url = (meta?.avatar_url ?? meta?.picture) as string | undefined
      const name = (meta?.full_name ?? meta?.name) as string | undefined
      setAvatarUrl(url ?? null)
      setFirstName(name?.split(" ")[0] ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const meta = session?.user?.user_metadata
      const url = (meta?.avatar_url ?? meta?.picture) as string | undefined
      const name = (meta?.full_name ?? meta?.name) as string | undefined
      setAvatarUrl(url ?? null)
      setFirstName(name?.split(" ")[0] ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const closeMobileMenu = () => setIsMobileOpen(false)

  const sidebarContent = (
    <>
      {/* Logo */}
      <Link href="/" onClick={closeMobileMenu}>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="mb-8 cursor-pointer">
          <div className="w-12 h-12 flex items-center justify-center">
            <Image src={logo} alt="Logo" width={48} height={48} />
          </div>
        </motion.div>
      </Link>

      {/* Navigation Items */}
      <nav className="flex-1 flex flex-col items-center justify-center gap-4 w-full px-3">
        {navItems.map((item) => (
          <Link key={item.label} href={item.href} className="w-full" onClick={closeMobileMenu}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex items-center justify-center cursor-pointer group"
            >
              <motion.div
                whileHover={{ backgroundColor: "#3c3f45" }}
                className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors"
              >
                <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </motion.div>
              {/* Tooltip on hover */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#2b2d31] border border-border rounded-md text-sm text-foreground whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 pointer-events-none">
                {item.label}
              </div>
            </motion.div>
          </Link>
        ))}
      </nav>

      {/* Bottom Icons */}
      <div className="flex flex-col items-center gap-6 mt-auto">
        <div
          className="relative"
          onMouseEnter={() => setShowDropdown(true)}
          onMouseLeave={() => setShowDropdown(false)}
        >
          {firstName && (
            <span className="block text-xs text-muted-foreground text-center mb-1 truncate max-w-[72px]">
              {firstName}
            </span>
          )}
          <Link href="/account" onClick={closeMobileMenu}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-1 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Account avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-background" />
                )}
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Account</span>
            </motion.div>
          </Link>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute left-full bottom-0 ml-2 bg-[#2b2d31] border border-border rounded-lg shadow-lg py-1 min-w-[120px] z-50"
              >
                <button
                  onClick={() => {
                    handleLogout()
                    closeMobileMenu()
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-[#3c3f45] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 rounded-lg bg-[#2b2d31] flex items-center justify-center"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={closeMobileMenu}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 h-screen w-20 bg-[#2b2d31] flex flex-col items-center py-6 z-50 md:hidden"
          >
            {/* Close Button */}
            <button
              onClick={closeMobileMenu}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-transparent flex items-center justify-center hover:bg-[#3c3f45] transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-20 bg-[#2b2d31] flex-col items-center py-6 z-50">
        {sidebarContent}
      </aside>
    </>
  )
}
