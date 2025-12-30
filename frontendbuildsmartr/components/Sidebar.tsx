"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { History, User, LogOut, Menu, X, Plus, FolderOpen, PanelLeftClose, PanelLeft } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import logo from "@/public/logo.png"
import { useProjects } from "@/contexts/ProjectContext"
import { NewProjectModal } from "./NewProjectModal"

type SidebarProps = {
  initialAvatarUrl?: string | null
  initialFirstName?: string | null
}

export function Sidebar({ initialAvatarUrl = null, initialFirstName = null }: SidebarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl)
  const [firstName, setFirstName] = useState<string | null>(initialFirstName)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { projects, setCurrentProject } = useProjects()

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

  const handleProjectClick = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setCurrentProject(project)
      router.push(`/project/${projectId}`)
      closeMobileMenu()
    }
  }

  // Tooltip component for collapsed state
  const Tooltip = ({ children, label }: { children: React.ReactNode; label: string }) => (
    <div className="relative group/tooltip">
      {children}
      {!isExpanded && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-[#1f2121] border border-border rounded-md text-sm text-foreground whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-150 z-[60] pointer-events-none">
          {label}
        </div>
      )}
    </div>
  )

  const sidebarContent = (isExpandedView: boolean) => (
    <>
      {/* Header - Logo and Toggle */}
      <div className={`flex items-center w-full px-3 mb-4 ${isExpandedView ? 'justify-between' : 'justify-center'}`}>
        {isExpandedView ? (
          // Expanded: Logo + Name on left, collapse button on right
          <>
            <Link href="/" onClick={closeMobileMenu} className="flex items-center gap-3 min-w-0">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="cursor-pointer flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                  <Image src={logo} alt="Logo" width={40} height={40} />
                </div>
                {firstName && (
                  <span className="text-sm font-medium text-foreground truncate">{firstName}</span>
                )}
              </motion.div>
            </Link>
            
            {/* Collapse button - only on desktop */}
            {!isMobileOpen && (
              <button
                onClick={() => setIsExpanded(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#3c3f45] transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </>
        ) : (
          // Collapsed: Logo with expand icon on hover
          <div className="relative group/logo">
            <Link href="/" onClick={closeMobileMenu}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="cursor-pointer">
                <div className="w-12 h-12 flex items-center justify-center">
                  <Image src={logo} alt="Logo" width={48} height={48} />
                </div>
              </motion.div>
            </Link>
            
            {/* Expand button - appears on hover */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(true)
              }}
              className="absolute -right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-[#3c3f45] flex items-center justify-center opacity-0 invisible group-hover/logo:opacity-100 group-hover/logo:visible transition-all duration-150 text-muted-foreground hover:text-foreground hover:bg-[#4a4d52] z-10"
              aria-label="Expand sidebar"
            >
              <PanelLeft className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* New Chat Button */}
      <div className={`w-full ${isExpandedView ? 'px-3' : 'px-2'} mb-4`}>
        <Tooltip label="New Chat">
          <Link href="/chat" onClick={closeMobileMenu}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                flex items-center ${isExpandedView ? 'justify-start gap-3 px-3' : 'justify-center'} py-2 rounded-lg cursor-pointer transition-colors
                ${pathname === '/chat' ? 'bg-accent text-background' : 'bg-[#3c3f45] hover:bg-[#4a4d52] text-foreground'}
              `}
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              {isExpandedView && <span className="text-sm font-medium">New Chat</span>}
            </motion.div>
          </Link>
        </Tooltip>
      </div>

      {/* Projects Section */}
      <div className={`flex-1 w-full ${isExpandedView ? 'px-3' : 'px-2'} overflow-hidden flex flex-col`}>
        {/* New Project Button */}
        <Tooltip label="New Project">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsNewProjectModalOpen(true)}
            className={`
              flex items-center ${isExpandedView ? 'justify-start gap-3 px-3' : 'justify-center'} py-2 rounded-lg cursor-pointer transition-colors 
              bg-transparent border border-dashed border-border hover:border-accent hover:bg-[#3c3f45]/50 text-muted-foreground hover:text-foreground w-full mb-3
            `}
          >
            <FolderOpen className="w-4 h-4 flex-shrink-0" />
            {isExpandedView && <span className="text-sm font-medium">New Project</span>}
          </motion.button>
        </Tooltip>

        {/* Projects List */}
        {projects.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-1">
            {isExpandedView && (
              <span className="text-[10px] uppercase text-muted-foreground px-1 mb-2 block">Projects</span>
            )}
            {projects.map((project) => (
              <Tooltip key={project.id} label={project.name}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleProjectClick(project.id)}
                  className={`
                    flex items-center ${isExpandedView ? 'gap-3 px-3' : 'justify-center'} py-2 rounded-lg cursor-pointer transition-colors group
                    ${pathname === `/project/${project.id}` 
                      ? 'bg-accent/20 text-foreground' 
                      : 'hover:bg-[#3c3f45] text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  <FolderOpen className="w-4 h-4 flex-shrink-0" />
                  {isExpandedView && <span className="text-sm truncate">{project.name}</span>}
                </motion.div>
              </Tooltip>
            ))}
          </div>
        )}
      </div>

      {/* History Link */}
      <div className={`w-full ${isExpandedView ? 'px-3' : 'px-2'} mt-auto mb-4`}>
        <Tooltip label="History">
          <Link href="/history" onClick={closeMobileMenu}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                flex items-center ${isExpandedView ? 'justify-start gap-3 px-3' : 'justify-center'} py-2 rounded-lg cursor-pointer transition-colors
                ${pathname === '/history' ? 'bg-[#3c3f45] text-foreground' : 'hover:bg-[#3c3f45] text-muted-foreground hover:text-foreground'}
              `}
            >
              <History className="w-4 h-4 flex-shrink-0" />
              {isExpandedView && <span className="text-sm font-medium">History</span>}
            </motion.div>
          </Link>
        </Tooltip>
      </div>

      {/* Bottom - User Account */}
      <div className={`w-full ${isExpandedView ? 'px-3' : 'px-2'} border-t border-border pt-4`}>
        <div
          className="relative"
          onMouseEnter={() => setShowDropdown(true)}
          onMouseLeave={() => setShowDropdown(false)}
        >
          <Link href="/account" onClick={closeMobileMenu}>
            <motion.div
              whileHover={{ backgroundColor: "#3c3f45" }}
              whileTap={{ scale: 0.98 }}
              className={`
                flex items-center ${isExpandedView ? 'gap-3 px-2' : 'justify-center'} py-2 rounded-lg cursor-pointer transition-colors
              `}
            >
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center overflow-hidden flex-shrink-0">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Account avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-background" />
                )}
              </div>
              {isExpandedView && (
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-foreground truncate block">{firstName || 'Account'}</span>
                </div>
              )}
            </motion.div>
          </Link>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.15 }}
                className={`absolute ${isExpandedView ? 'left-0 right-0 bottom-full mb-1' : 'left-full bottom-0 ml-2'} bg-[#2b2d31] border border-border rounded-lg shadow-lg py-1 min-w-[120px] z-[60]`}
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
      {/* New Project Modal */}
      <NewProjectModal 
        isOpen={isNewProjectModalOpen} 
        onClose={() => setIsNewProjectModalOpen(false)} 
      />

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
            className="fixed left-0 top-0 h-screen w-64 bg-[#2b2d31] flex flex-col py-4 z-50 md:hidden"
          >
            {/* Close Button */}
            <button
              onClick={closeMobileMenu}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-transparent flex items-center justify-center hover:bg-[#3c3f45] transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            {sidebarContent(true)}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:flex fixed left-0 top-0 h-screen bg-[#2b2d31] flex-col py-4 z-50 transition-all duration-300 ease-in-out ${
          isExpanded ? 'w-64' : 'w-20'
        }`}
      >
        {sidebarContent(isExpanded)}
      </aside>
    </>
  )
}
