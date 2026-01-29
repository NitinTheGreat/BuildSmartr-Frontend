"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { User, Menu, X, Plus, FolderOpen, PanelLeftClose, PanelLeft, MessageSquare, ChevronDown, ChevronRight, Search, Loader2, Trash2, ExternalLink, MoreVertical, AlertCircle } from "lucide-react"
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
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; projectId: string } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ projectId: string; projectName: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [projectMenuOpen, setProjectMenuOpen] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const { projects, setCurrentProject, setCurrentChatId, deleteProject, isLoading } = useProjects()

  // Only listen for auth state changes (avatar/name updates)
  // Initial data is passed via props from server component to avoid duplicate auth calls
  useEffect(() => {
    const supabase = createClient()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const meta = session.user?.user_metadata
        const url = (meta?.avatar_url ?? meta?.picture) as string | undefined
        const name = (meta?.full_name ?? meta?.name) as string | undefined
        setAvatarUrl(url ?? null)
        setFirstName(name?.split(" ")[0] ?? null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const closeMobileMenu = () => setIsMobileOpen(false)

  const handleProjectClick = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const project = projects.find(p => p.id === projectId)
    if (!project) return

    // Check if project is still indexing
    const isIndexing = project.indexingStatus === 'indexing' || project.indexingStatus === 'not_started'
    const isFailed = project.indexingStatus === 'failed'

    if (isIndexing || isFailed) {
      // Don't navigate for indexing/failed projects
      return
    }

    // Navigate to project and set it as current
    setCurrentProject(project)
    setCurrentChatId(null)
    router.push(`/project/${projectId}`)
    closeMobileMenu()
  }

  const handleProjectExpand = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const project = projects.find(p => p.id === projectId)
    if (!project) return

    const isIndexing = project.indexingStatus === 'indexing' || project.indexingStatus === 'not_started'
    const isFailed = project.indexingStatus === 'failed'

    if (isIndexing || isFailed) return

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

  const handleProjectNavigate = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      // Don't navigate if project is still indexing or failed
      if (project.indexingStatus === 'indexing' || project.indexingStatus === 'not_started') {
        return
      }
      if (project.indexingStatus === 'failed') {
        return
      }

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

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, projectId })
  }

  // Close context menu and project menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null)
      setProjectMenuOpen(null)
    }
    if (contextMenu || projectMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu, projectMenuOpen])

  // Handle delete project
  const handleDeleteProject = async (projectId: string) => {
    setIsDeleting(true)
    try {
      await deleteProject(projectId)
      setDeleteConfirm(null)
      // Navigate to home if we deleted the current project
      if (pathname === `/project/${projectId}`) {
        router.push('/')
      }
    } catch (error) {
      console.error('Failed to delete project:', error)
    } finally {
      setIsDeleting(false)
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
              <div className="cursor-pointer flex items-center gap-3 transition-transform duration-150 hover:scale-105 active:scale-95">
                <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                  <Image src={logo} alt="Logo" width={40} height={40} />
                </div>
                {firstName && (
                  <span className="text-sm font-medium text-foreground truncate">{firstName}</span>
                )}
              </div>
            </Link>

            {/* Collapse button - only on desktop */}
            {!isMobileOpen && (
              <button
                onClick={() => setIsExpanded(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#1e293b] transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
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
              <div className="cursor-pointer transition-transform duration-150 hover:scale-105 active:scale-95">
                <div className="w-12 h-12 flex items-center justify-center">
                  <Image src={logo} alt="Logo" width={48} height={48} />
                </div>
              </div>
            </Link>

            {/* Expand button - appears on hover */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(true)
              }}
              className="absolute -right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-[#1e293b] flex items-center justify-center opacity-0 invisible group-hover/logo:opacity-100 group-hover/logo:visible transition-all duration-150 text-muted-foreground hover:text-foreground hover:bg-[#334155] z-10"
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
                ${pathname === '/chat' ? 'bg-accent text-background' : 'bg-[#1e293b] hover:bg-[#334155] text-foreground'}
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
              className="w-full bg-[#1e293b] border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      )}

      {/* Projects Section */}
      <div className={`flex-1 w-full ${isExpandedView ? 'px-3' : 'px-2'} overflow-hidden flex flex-col`}>
        {/* New Project Button */}
        <Tooltip label="New Project">
          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className={`
              flex items-center ${isExpandedView ? 'justify-start gap-3 px-3' : 'justify-center'} py-2 rounded-lg cursor-pointer transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]
              bg-transparent border border-dashed border-border hover:border-accent hover:bg-[#1e293b]/50 text-muted-foreground hover:text-foreground w-full mb-3
            `}
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            {isExpandedView && <span className="text-sm font-medium">New Project</span>}
          </button>
        </Tooltip>

        {/* Scrollable content area for projects and chats */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3">
          {/* Loading Skeletons */}
          {isLoading && projects.length === 0 && (
            <div className="space-y-1">
              {isExpandedView && (
                <span className="text-[10px] uppercase text-muted-foreground px-1 mb-2 block">Projects</span>
              )}
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`flex items-center ${isExpandedView ? 'gap-2 px-3' : 'justify-center'} py-2 rounded-lg`}
                >
                  {/* Animated skeleton loader */}
                  <div className="w-4 h-4 rounded bg-muted/50 animate-pulse flex-shrink-0" />
                  {isExpandedView && (
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-muted/50 rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Projects List */}
          {/* Show ALL projects with inline status */}
          {projects
            .filter(p => searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 && (
              <div className="space-y-1">
                {isExpandedView && (
                  <span className="text-[10px] uppercase text-muted-foreground px-1 mb-2 block">Projects</span>
                )}
                {projects
                  .filter(p => searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((project) => {
                    const isProjectExpanded = expandedProjectId === project.id
                    const isCurrentProject = pathname === `/project/${project.id}`
                    const isIndexing = project.indexingStatus === 'indexing' || project.indexingStatus === 'not_started'
                    const isFailed = project.indexingStatus === 'failed'
                    const isReady = project.indexingStatus === 'completed' || (!project.indexingStatus && project.aiProjectId)

                    return (
                      <div key={project.id}>
                        <Tooltip label={isIndexing ? `${project.name} (syncing...)` : isFailed ? `${project.name} (failed)` : project.name}>
                          <div
                            onClick={(e) => handleProjectClick(project.id, e)}
                            onContextMenu={(e) => handleContextMenu(e, project.id)}
                            className={`
                            flex flex-col ${isExpandedView ? 'gap-1 px-3' : 'justify-center'} py-2 rounded-lg transition-all duration-150 group
                            ${isIndexing || isFailed
                                ? 'opacity-60 cursor-default'
                                : 'cursor-pointer active:scale-[0.98]'
                              }
                            ${isCurrentProject && isReady
                                ? 'bg-accent/20 text-foreground'
                                : 'hover:bg-[#1e293b] text-muted-foreground hover:text-foreground'
                              }
                          `}
                          >
                            <div className={`flex items-center ${isExpandedView ? 'gap-2' : 'justify-center'}`}>
                              {isExpandedView && (
                                <button
                                  onClick={(e) => handleProjectExpand(project.id, e)}
                                  className="w-4 h-4 flex items-center justify-center flex-shrink-0 hover:text-accent transition-colors"
                                >
                                  {isReady && project.chats.length > 0 ? (
                                    isProjectExpanded ? (
                                      <ChevronDown className="w-3 h-3" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3" />
                                    )
                                  ) : null}
                                </button>
                              )}
                              {/* Status icon */}
                              {isIndexing ? (
                                <Loader2 className="w-4 h-4 flex-shrink-0 text-accent animate-spin" />
                              ) : isFailed ? (
                                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                              ) : (
                                <FolderOpen className="w-4 h-4 flex-shrink-0" />
                              )}
                              {isExpandedView && (
                                <>
                                  <span className={`text-sm truncate flex-1 ${isIndexing ? 'italic' : ''}`}>
                                    {project.name}
                                    {isIndexing && <span className="text-xs text-muted-foreground ml-1">(syncing)</span>}
                                    {isFailed && <span className="text-xs text-red-400 ml-1">(failed)</span>}
                                  </span>
                                  {isReady && project.chats.length > 0 && (
                                    <span className="text-[10px] text-muted-foreground mr-1">{project.chats.length}</span>
                                  )}
                                  {/* 3-dot menu button - only show for ready or failed projects */}
                                  {(isReady || isFailed) && (
                                    <div className="relative">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setProjectMenuOpen(projectMenuOpen === project.id ? null : project.id)
                                        }}
                                        className="p-1 rounded hover:bg-[#334155] text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        <MoreVertical className="w-4 h-4" />
                                      </button>
                                      {/* Dropdown menu */}
                                      <AnimatePresence>
                                        {projectMenuOpen === project.id && (
                                          <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.1 }}
                                            className="absolute right-0 top-full mt-1 bg-[#0d1117] border border-border rounded-lg shadow-xl py-1 z-[100] min-w-[140px]"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {isReady && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleProjectNavigate(project.id)
                                                  setProjectMenuOpen(null)
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-[#1e293b] transition-colors"
                                              >
                                                <ExternalLink className="w-4 h-4" />
                                                Open
                                              </button>
                                            )}
                                            <div className="h-px bg-border my-1" />
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setDeleteConfirm({ projectId: project.id, projectName: project.name })
                                                setProjectMenuOpen(null)
                                              }}
                                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-[#1e293b] transition-colors"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                              Delete
                                            </button>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </Tooltip>

                        {/* Chats list - shown when project is expanded and ready */}
                        {isExpandedView && isProjectExpanded && isReady && project.chats.length > 0 && (
                          <AnimatePresence>
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="ml-6 mt-1 space-y-1 border-l border-border pl-2"
                            >
                              {project.chats.map((chat) => (
                                <div
                                  key={chat.id}
                                  onClick={() => handleChatClick(project.id, chat.id)}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] hover:bg-[#1e293b] text-muted-foreground hover:text-foreground"
                                >
                                  <MessageSquare className="w-3 h-3 flex-shrink-0" />
                                  <span className="text-xs truncate">{chat.title}</span>
                                </div>
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
                        hover:bg-[#1e293b] text-muted-foreground hover:text-foreground
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
        <Link href="/account" onClick={closeMobileMenu}>
          <div
            className={`
              flex items-center ${isExpandedView ? 'gap-3 px-2' : 'justify-center'} py-2 rounded-lg cursor-pointer transition-all duration-150 hover:bg-[#1e293b] active:scale-[0.98]
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
          </div>
        </Link>
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

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed bg-[#0d1117] border border-border rounded-lg shadow-xl py-1 z-[100] min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                handleProjectNavigate(contextMenu.projectId)
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-[#1e293b] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Project
            </button>
            <div className="h-px bg-border my-1" />
            <button
              onClick={() => {
                const project = projects.find(p => p.id === contextMenu.projectId)
                if (project) {
                  setDeleteConfirm({ projectId: project.id, projectName: project.name })
                }
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-[#1e293b] transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Project
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[100]"
              onClick={() => !isDeleting && setDeleteConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-[#111827] border border-border rounded-xl shadow-2xl z-[101] p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Delete Project</h3>
                  <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete <span className="text-foreground font-medium">&quot;{deleteConfirm.projectName}&quot;</span>?
                All project data, chats, and files will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-foreground bg-transparent border border-border rounded-lg hover:bg-[#1e293b] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteProject(deleteConfirm.projectId)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed z-50 md:hidden w-11 h-11 rounded-xl bg-[#0d1117]/95 backdrop-blur-sm flex items-center justify-center shadow-lg border border-border/50 transition-all duration-200 hover:bg-[#1e293b] active:scale-95"
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
            className="fixed left-0 top-0 h-screen w-[280px] max-w-[85vw] bg-[#0d1117] flex flex-col z-50 md:hidden overflow-x-hidden shadow-2xl"
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              paddingLeft: 'env(safe-area-inset-left, 0px)',
            }}
          >
            {/* Close Button */}
            <button
              onClick={closeMobileMenu}
              className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-transparent flex items-center justify-center hover:bg-[#1e293b] transition-colors z-10"
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
        className={`hidden md:flex fixed left-0 top-0 h-screen bg-[#0d1117] flex-col z-50 transition-all duration-300 ease-out overflow-y-auto ${isExpanded ? 'w-64' : 'w-20'
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
