"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { LogOut, Loader2 } from "lucide-react"

export function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      // Force a hard page reload to clear all cached state
      window.location.href = "/"
    } catch (error) {
      console.error("Logout failed:", error)
      setIsLoggingOut(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoggingOut ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-medium">Signing out...</span>
        </>
      ) : (
        <>
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </>
      )}
    </button>
  )
}
