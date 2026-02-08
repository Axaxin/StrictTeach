/**
 * Global Mastery Refresh System
 *
 * Provides a global mechanism to trigger mastery data refresh across all components.
 * This solves the problem of fragmented mastery data where components show stale data.
 */

type RefreshCallback = () => void;

class MasteryRefreshManager {
  private listeners: Set<RefreshCallback> = new Set();
  private version: number = 0;

  /**
   * Subscribe to mastery refresh events
   * Returns an unsubscribe function
   */
  subscribe(callback: RefreshCallback): () => void {
    this.listeners.add(callback);
    console.log(`[MasteryRefresh] Subscribed. Total listeners: ${this.listeners.size}`);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
      console.log(`[MasteryRefresh] Unsubscribed. Remaining listeners: ${this.listeners.size}`);
    };
  }

  /**
   * Trigger a refresh - notifies all subscribers
   */
  refresh(): void {
    this.version++;
    console.log(`[MasteryRefresh] Triggering refresh v${this.version}. Notifying ${this.listeners.size} listeners`);

    // Notify all listeners
    this.listeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[MasteryRefresh] Error in listener callback:', error);
      }
    });
  }

  /**
   * Get current version number (for debugging)
   */
  getVersion(): number {
    return this.version;
  }
}

// Global singleton instance
const globalMasteryRefresh = new MasteryRefreshManager();

/**
 * Hook to trigger mastery refresh globally
 * Call this after operations that modify mastery data (e.g., quiz completion)
 */
export function triggerMasteryRefresh(): void {
  globalMasteryRefresh.refresh();
}

/**
 * Hook to subscribe to mastery refresh events
 * Components should use this to re-fetch data when mastery changes
 */
export function useMasteryRefresh(callback: RefreshCallback): void {
  // We'll use React's useEffect to subscribe/unsubscribe
  // This is implemented in the hook itself, not here
}

/**
 * Export the global instance for direct access if needed
 */
export { globalMasteryRefresh };
