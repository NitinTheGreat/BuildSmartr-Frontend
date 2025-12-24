"use client"

import { motion } from "framer-motion"
import { Plus, Library, Compass, MessageSquare, MoreHorizontal, Bell, User } from "lucide-react"
import Link from "next/link"

const navItems = [
  { icon: Library, label: "Library", href: "/library" },
  { icon: Compass, label: "Discover", href: "/discover" },
  { icon: MessageSquare, label: "Spaces", href: "/spaces" },
  { icon: MoreHorizontal, label: "More", href: "/more" },
]

export function Sidebar() {
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

        <Link href="/account">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-1 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center overflow-hidden">
              <User className="w-6 h-6 text-background" />
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Account</span>
          </motion.div>
        </Link>
      </div>
    </aside>
  )
}
