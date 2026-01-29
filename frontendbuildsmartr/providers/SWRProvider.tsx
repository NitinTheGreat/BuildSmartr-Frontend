"use client"

import { SWRConfig } from "swr"
import type { ReactNode } from "react"
import { swrFetcher } from "@/lib/api"

interface SWRProviderProps {
    children: ReactNode
}

/**
 * Global SWR configuration provider
 * Database as single source of truth with sensible defaults
 */
export function SWRProvider({ children }: SWRProviderProps) {
    return (
        <SWRConfig
            value={{
                fetcher: swrFetcher,
                // Revalidation settings - less aggressive to prevent loops
                revalidateOnFocus: false,       // Don't auto-refetch on tab focus (can cause loops)
                revalidateOnReconnect: true,    // Refetch when network reconnects
                revalidateIfStale: false,       // Don't auto-refetch stale data
                revalidateOnMount: true,        // Fetch on first mount
                // Performance settings
                dedupingInterval: 5000,         // Prevent duplicate requests within 5s
                focusThrottleInterval: 30000,   // If focus revalidation is on, max once per 30s
                // Error handling
                shouldRetryOnError: false,      // Don't auto-retry on error
                // Cache behavior
                keepPreviousData: true,         // Show old data while revalidating
            }}
        >
            {children}
        </SWRConfig>
    )
}
