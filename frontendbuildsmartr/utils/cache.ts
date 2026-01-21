/**
 * In-memory cache with TTL support for API responses
 * Provides fast caching with automatic expiration and manual invalidation
 */

interface CacheEntry<T> {
    data: T
    timestamp: number
    ttl: number
}

interface CacheConfig {
    defaultTTL: number  // Default TTL in milliseconds
    maxEntries: number  // Maximum number of entries to store
}

const DEFAULT_CONFIG: CacheConfig = {
    defaultTTL: 5 * 60 * 1000,  // 5 minutes default
    maxEntries: 100,
}

class ApiCache {
    private cache: Map<string, CacheEntry<unknown>> = new Map()
    private config: CacheConfig

    constructor(config: Partial<CacheConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config }
    }

    /**
     * Get cached data if valid, otherwise return null
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key) as CacheEntry<T> | undefined

        if (!entry) return null

        // Check if expired
        if (Date.now() > entry.timestamp + entry.ttl) {
            this.cache.delete(key)
            return null
        }

        return entry.data
    }

    /**
     * Set cached data with optional TTL override
     */
    set<T>(key: string, data: T, ttl?: number): void {
        // Evict oldest entries if at max capacity
        if (this.cache.size >= this.config.maxEntries) {
            const oldestKey = this.cache.keys().next().value
            if (oldestKey) this.cache.delete(oldestKey)
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: ttl ?? this.config.defaultTTL,
        })
    }

    /**
     * Invalidate specific cache entry
     */
    invalidate(key: string): void {
        this.cache.delete(key)
    }

    /**
     * Invalidate all entries matching a pattern
     */
    invalidatePattern(pattern: string | RegExp): void {
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key)
            }
        }
    }

    /**
     * Invalidate all cache entries
     */
    invalidateAll(): void {
        this.cache.clear()
    }

    /**
     * Check if a key exists and is valid
     */
    has(key: string): boolean {
        return this.get(key) !== null
    }

    /**
     * Get cache stats for debugging
     */
    getStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        }
    }
}

// Singleton instance with optimized TTLs
export const apiCache = new ApiCache({
    defaultTTL: 2 * 60 * 1000,  // 2 minutes default
    maxEntries: 200,
})

// Common TTL presets (in milliseconds)
export const CacheTTL = {
    VERY_SHORT: 30 * 1000,      // 30 seconds - for rapidly changing data
    SHORT: 1 * 60 * 1000,       // 1 minute - for frequently updated data
    MEDIUM: 5 * 60 * 1000,      // 5 minutes - for moderately stable data
    LONG: 15 * 60 * 1000,       // 15 minutes - for stable data
    VERY_LONG: 60 * 60 * 1000,  // 1 hour - for rarely changing data
} as const

// Keys for common cache entries
export const CacheKeys = {
    PROJECTS: '/projects',
    PROJECT: (id: string) => `/projects/${id}`,
    CHATS: '/chats',
    CHAT_MESSAGES: (chatId: string) => `/chats/${chatId}/messages`,
} as const

/**
 * Cached fetch wrapper - fetches from cache first, then network
 */
export async function cachedFetch<T>(
    endpoint: string,
    fetchFn: () => Promise<T>,
    options: {
        ttl?: number
        forceRefresh?: boolean
        cacheKey?: string
    } = {}
): Promise<T> {
    const cacheKey = options.cacheKey ?? endpoint

    // Return cached data if available and not forcing refresh
    if (!options.forceRefresh) {
        const cached = apiCache.get<T>(cacheKey)
        if (cached !== null) {
            console.log(`[Cache] HIT: ${cacheKey}`)
            return cached
        }
    }

    console.log(`[Cache] MISS: ${cacheKey}`)

    // Fetch fresh data
    const data = await fetchFn()

    // Cache the result
    apiCache.set(cacheKey, data, options.ttl)

    return data
}

/**
 * Memoization helper for expensive computations
 */
const memoCache = new Map<string, { result: unknown; timestamp: number }>()
const MEMO_TTL = 60 * 1000 // 1 minute

export function memoize<T extends (...args: unknown[]) => unknown>(
    fn: T,
    keyFn?: (...args: Parameters<T>) => string
): T {
    return ((...args: Parameters<T>) => {
        const key = keyFn ? keyFn(...args) : JSON.stringify(args)
        const cached = memoCache.get(key)

        if (cached && Date.now() - cached.timestamp < MEMO_TTL) {
            return cached.result
        }

        const result = fn(...args)
        memoCache.set(key, { result, timestamp: Date.now() })
        return result
    }) as T
}

/**
 * Batch multiple requests together (deduplication)
 */
const pendingRequests = new Map<string, Promise<unknown>>()

export async function deduplicatedFetch<T>(
    key: string,
    fetchFn: () => Promise<T>
): Promise<T> {
    // If there's already a pending request, return it
    const pending = pendingRequests.get(key)
    if (pending) {
        console.log(`[Dedup] Reusing pending request: ${key}`)
        return pending as Promise<T>
    }

    // Create new request and store it
    const promise = fetchFn().finally(() => {
        pendingRequests.delete(key)
    })

    pendingRequests.set(key, promise)
    return promise
}

export default apiCache
