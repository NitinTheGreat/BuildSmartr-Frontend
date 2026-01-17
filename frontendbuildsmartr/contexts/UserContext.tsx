"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { createClient } from "@/utils/supabase/client"

// ============================================
// Types
// ============================================

interface UserData {
  avatarUrl: string | null
  firstName: string | null
  fullName: string | null
  email: string | null
}

interface UserContextType {
  user: UserData
  isLoading: boolean
}

// ============================================
// Context
// ============================================

const UserContext = createContext<UserContextType | undefined>(undefined)

interface UserProviderProps {
  children: ReactNode
  initialAvatarUrl?: string | null
  initialFirstName?: string | null
  initialFullName?: string | null
  initialEmail?: string | null
}

/**
 * UserProvider - Centralizes user authentication state
 * 
 * Receives initial user data from server-side layout to avoid
 * redundant client-side auth calls. Only listens for auth state
 * changes to handle session refresh/logout.
 */
export function UserProvider({
  children,
  initialAvatarUrl = null,
  initialFirstName = null,
  initialFullName = null,
  initialEmail = null,
}: UserProviderProps) {
  const [user, setUser] = useState<UserData>({
    avatarUrl: initialAvatarUrl,
    firstName: initialFirstName,
    fullName: initialFullName,
    email: initialEmail,
  })
  const [isLoading, setIsLoading] = useState(false)

  // Listen for auth state changes (session refresh, logout)
  useEffect(() => {
    const supabase = createClient()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata
        const avatarUrl = (meta?.avatar_url ?? meta?.picture ?? null) as string | null
        const fullName = (meta?.full_name ?? meta?.name ?? null) as string | null
        const firstName = fullName?.split(" ")[0] ?? null
        const email = session.user.email ?? null

        setUser({ avatarUrl, firstName, fullName, email })
      } else {
        // User logged out
        setUser({
          avatarUrl: null,
          firstName: null,
          fullName: null,
          email: null,
        })
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <UserContext.Provider value={{ user, isLoading }}>
      {children}
    </UserContext.Provider>
  )
}

// ============================================
// Hook
// ============================================

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
