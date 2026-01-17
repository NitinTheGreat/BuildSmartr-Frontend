/**
 * Environment-aware logging utility
 * Only logs debug messages in development mode
 */

const isDev = process.env.NODE_ENV === 'development'

export const log = {
  /**
   * Debug logging - only outputs in development
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.log('[DEBUG]', ...args)
    }
  },

  /**
   * Info logging - only outputs in development
   */
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info('[INFO]', ...args)
    }
  },

  /**
   * Warning logging - always outputs
   */
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args)
  },

  /**
   * Error logging - always outputs
   */
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args)
  },
}
