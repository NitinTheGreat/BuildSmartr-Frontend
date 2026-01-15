"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { User, LogOut, Menu, X, Plus, FolderOpen, PanelLeftClose, PanelLeft, MessageSquare, ChevronDown, ChevronRight, Search, Loader2, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import logo from "@/public/logo.png"
import { useProjects } from "@/contexts/ProjectContext"
import { useIndexing } from "@/contexts/IndexingContext"
import { NewProjectModal } from "./NewProjectModal"

type SidebarProps = {
  initialAvatarUrl?: string | null
  initialFirstName?: string | null
}

export function Sidebar({ initialAvatarUrl = null, initialFirstName = null }: SidebarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl)
  const [firstName, setFirstName] = useState<string | null>(initialFirstName)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()
  const pathname = usePathname()
  const { projects, setCurrentProject, setCurrentChatId, generalChats, setCurrentGeneralChatId, deleteGeneralChat } = useProjects()
  const { indexingStates } = useIndexing()

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

  const handleProjectClick = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setCurrentProject(project)
      // Toggle expanded state for this project
      if (expandedProjectId === projectId) {
        setExpandedProjectId(null)
      } else {
        setExpandedProjectId(projectId)
        // Auto-expand sidebar when expanding a project
        if (!isExpanded && !isMobileOpen) {
          setIsExpanded(true)
        }
      }
    }
  }

  const handleProjectNavigate = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setCurrentProject(project)
      setCurrentChatId(null)
      router.push(`/project/${projectId}`)
      closeMobileMenu()
    }
  }

  const handleChatClick = (projectId: string, chatId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setCurrentProject(project)
      setCurrentChatId(chatId)
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
      {/* to be uncommented later */}
      {/* New Chat Button */}
      {/* <div className={`w-full ${isExpandedView ? 'px-3' : 'px-2'} mb-4`}>
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
      </div> */}

      {/* Search Box - Expanded View Only */}
      {isExpandedView && (
        <div className="w-full px-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#3c3f45] border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      )}

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

        {/* Scrollable content area for projects and chats */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3">
          {/* Projects List */}
          {projects.filter(p => searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 && (
            <div className="space-y-1">
              {isExpandedView && (
                <span className="text-[10px] uppercase text-muted-foreground px-1 mb-2 block">Projects</span>
              )}
              {projects
                .filter(p => searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((project) => {
                  const isProjectExpanded = expandedProjectId === project.id
                  const isCurrentProject = pathname === `/project/${project.id}`

                  return (
                    <div key={project.id}>
                      <Tooltip label={project.name}>
                        <motion.div
                          whileTap={{ scale: 0.98 }}
                          onClick={(e) => handleProjectClick(project.id, e)}
                          className={`
                            flex flex-col ${isExpandedView ? 'gap-1 px-3' : 'justify-center'} py-2 rounded-lg cursor-pointer transition-colors group
                            ${isCurrentProject
                              ? 'bg-accent/20 text-foreground'
                              : 'hover:bg-[#3c3f45] text-muted-foreground hover:text-foreground'
                            }
                          `}
                        >
                          <div className={`flex items-center ${isExpandedView ? 'gap-2' : 'justify-center'}`}>
                            {isExpandedView && (
                              <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                                {project.chats.length > 0 ? (
                                  isProjectExpanded ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3" />
                                  )
                                ) : null}
                              </span>
                            )}
                            {/* Show indexing spinner or folder icon */}
                            {indexingStates[project.id]?.status === 'indexing' ? (
                              <Loader2 className="w-4 h-4 flex-shrink-0 text-accent animate-spin" />
                            ) : indexingStates[project.id]?.status === 'completed' &&
                              indexingStates[project.id]?.completedAt &&
                              Date.now() - indexingStates[project.id].completedAt! < 30000 ? (
                              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-400" />
                            ) : (
                              <FolderOpen className="w-4 h-4 flex-shrink-0" />
                            )}
                            {isExpandedView && (
                              <>
                                <span
                                  className="text-sm truncate flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleProjectNavigate(project.id)
                                  }}
                                >
                                  {project.name}
                                </span>
                                {project.chats.length > 0 && !indexingStates[project.id] && (
                                  <span className="text-[10px] text-muted-foreground">{project.chats.length}</span>
                                )}
                              </>
                            )}
                          </div>

                          {/* Indexing progress bar */}
                          {isExpandedView && indexingStates[project.id]?.status === 'indexing' && (
                            <div className="mt-1">
                              <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent-strong transition-all duration-300"
                                  style={{ width: `${indexingStates[project.id]?.percent || 0}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                {indexingStates[project.id]?.currentStep || 'Indexing...'}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      </Tooltip>

                      {/* Chats list - shown when project is expanded */}
                      {isExpandedView && isProjectExpanded && project.chats.length > 0 && (
                        <AnimatePresence>
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="ml-6 mt-1 space-y-1 border-l border-border pl-2"
                          >
                            {project.chats.map((chat) => (
                              <motion.div
                                key={chat.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleChatClick(project.id, chat.id)}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-[#3c3f45] text-muted-foreground hover:text-foreground"
                              >
                                <MessageSquare className="w-3 h-3 flex-shrink-0" />
                                <span className="text-xs truncate">{chat.title}</span>
                              </motion.div>
                            ))}
                          </motion.div>
                        </AnimatePresence>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
          {/* to be uncommented */}
          {/* General Chats Section */}
          {/* {generalChats.filter(c => searchQuery === '' || c.title.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 && (
            <div className="space-y-1">
              {isExpandedView && (
                <span className="text-[10px] uppercase text-muted-foreground px-1 mb-2 block">Chats</span>
              )}
              {generalChats
                .filter(c => searchQuery === '' || c.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((chat) => (
                  <Tooltip key={chat.id} label={chat.title}>
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setCurrentGeneralChatId(chat.id)
                        router.push('/chat')
                        closeMobileMenu()
                      }}
                      className={`
                        flex items-center ${isExpandedView ? 'gap-2 px-3' : 'justify-center'} py-2 rounded-lg cursor-pointer transition-colors group
                        hover:bg-[#3c3f45] text-muted-foreground hover:text-foreground
                      `}
                    >
                      <MessageSquare className="w-4 h-4 flex-shrink-0" />
                      {isExpandedView && (
                        <span className="text-sm truncate flex-1">{chat.title}</span>
                      )}
                    </motion.div>
                  </Tooltip>
                ))}
            </div>
          )} */}
        </div>
      </div>

      {/* Bottom - User Account */}
      <div className={`w-full ${isExpandedView ? 'px-3' : 'px-2'} border-t border-border pt-4`}>
        <div className="relative group/profile">
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

          {/* Logout dropdown - shows on hover using CSS */}
          <div
            className={`
              absolute opacity-0 invisible group-hover/profile:opacity-100 group-hover/profile:visible transition-all duration-150
              ${isExpandedView ? 'left-0 right-0 bottom-full mb-1' : 'left-full top-1/2 -translate-y-1/2 ml-2'}
              bg-[#2b2d31] border border-border rounded-lg shadow-lg py-1 min-w-[120px] z-[60]
            `}
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
          </div>
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
        className="fixed z-50 md:hidden w-11 h-11 rounded-xl bg-[#2b2d31]/95 backdrop-blur-sm flex items-center justify-center shadow-lg border border-border/50 transition-all duration-200 hover:bg-[#3c3f45] active:scale-95"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          left: 'calc(env(safe-area-inset-left, 0px) + 12px)'
        }}
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
            className="fixed left-0 top-0 h-screen w-[280px] max-w-[85vw] bg-[#2b2d31] flex flex-col z-50 md:hidden overflow-x-hidden shadow-2xl"
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              paddingLeft: 'env(safe-area-inset-left, 0px)',
            }}
          >
            {/* Close Button */}
            <button
              onClick={closeMobileMenu}
              className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-transparent flex items-center justify-center hover:bg-[#3c3f45] transition-colors z-10"
              style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex-1 flex flex-col py-4 overflow-hidden">
              {sidebarContent(true)}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex fixed left-0 top-0 h-screen bg-[#2b2d31] flex-col z-50 transition-all duration-300 ease-out overflow-y-auto ${isExpanded ? 'w-64' : 'w-20'
          }`}
        style={{
          overflow: isExpanded ? 'hidden auto' : 'visible',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        }}
      >
        {sidebarContent(isExpanded)}
      </aside>
    </>
  )
}
