"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Library, Compass, MessageSquare, MoreHorizontal, Bell, User, LogOut } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"

const navItems = [
  { icon: Library, label: "Library", href: "/library" },
  { icon: Compass, label: "Discover", href: "/discover" },
  { icon: MessageSquare, label: "Spaces", href: "/spaces" },
  { icon: MoreHorizontal, label: "More", href: "/more" },
]

type SidebarProps = {
  initialAvatarUrl?: string | null
  initialFirstName?: string | null
}

export function Sidebar({ initialAvatarUrl = null, initialFirstName = null }: SidebarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl)
  const [firstName, setFirstName] = useState<string | null>(initialFirstName)
  const [showDropdown, setShowDropdown] = useState(false)
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

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 bg-[#2b2d31] flex flex-col items-center py-6 z-50">
      {/* Logo */}
      <Link href="/">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="mb-8 cursor-pointer">
          <div className="w-12 h-12 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2L4 7L12 12L20 7L12 2Z"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 17L12 22L20 17"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 12L12 17L20 12"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </motion.div>
      </Link>

      {/* Plus Button */}
      <motion.button
        whileHover={{ scale: 1.1, backgroundColor: "#3c3f45" }}
        whileTap={{ scale: 0.9 }}
        className="w-12 h-12 rounded-lg bg-transparent flex items-center justify-center mb-6 transition-colors"
      >
        <Plus className="w-6 h-6 text-muted-foreground" />
      </motion.button>

      {/* Navigation Items */}
      <nav className="flex-1 flex flex-col items-center gap-6 w-full px-3">
        {navItems.map((item) => (
          <Link key={item.label} href={item.href} className="w-full">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-1 cursor-pointer group"
            >
              <motion.div
                whileHover={{ backgroundColor: "#3c3f45" }}
                className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors"
              >
                <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </motion.div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                {item.label}
              </span>
            </motion.div>
          </Link>
        ))}
      </nav>

      {/* Bottom Icons */}
      <div className="flex flex-col items-center gap-6 mt-auto">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-12 h-12 rounded-lg bg-transparent flex items-center justify-center transition-colors hover:bg-[#3c3f45]"
        >
          <Bell className="w-5 h-5 text-muted-foreground" />
        </motion.button>

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
          <Link href="/account">
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
                  onClick={handleLogout}
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
    </aside>
  )
}
