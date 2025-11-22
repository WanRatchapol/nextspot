// Zustand store for liked destinations state management
// S-09 Liked List & Completion feature

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DestinationData } from '@/types/swipe-events';
import type {
  LikedDestination,
  LikedState,
  SwipeData,
  CompleteSessionResponse,
  LikedDestinationAnalytics
} from '@/types/liked-destinations';
import { getGlobalSessionTracker } from './session-timing-tracker';

const API_BASE = '/api/sessions';

interface LikedStoreState extends LikedState {
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;

  // Additional actions
  setSessionId: (sessionId: string) => void;
  loadLikedDestinations: (sessionId: string) => Promise<void>;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useLikedStore = create<LikedStoreState>()(
  persist(
    (set, get) => ({
      likedDestinations: [],
      sessionId: null,
      isLoading: false,
      error: null,

      setSessionId: (sessionId: string) => {
        set({ sessionId });
        // Load existing liked destinations for this session
        get().loadLikedDestinations(sessionId);
      },

      setError: (error: string | null) => set({ error }),

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      addLiked: (destination: DestinationData, swipeData: SwipeData) => {
        const likedDestination: LikedDestination = {
          ...destination,
          likedAt: new Date(),
          swipeVelocity: swipeData.velocity,
          viewDurationMs: swipeData.viewDurationMs,
          swipeAction: swipeData.action,
          swipeDirection: swipeData.direction
        };

        set(state => ({
          likedDestinations: [...state.likedDestinations, likedDestination],
          error: null
        }));

        // Track analytics event
        trackAnalyticsEvent('destination_liked', {
          destinationId: destination.id,
          sessionId: get().sessionId || '',
          count: get().likedDestinations.length,
          timestamp: new Date()
        });

        // Persist to backend
        persistLikedDestination(likedDestination);
      },

      removeLiked: (destinationId: string) => {
        const destination = get().likedDestinations.find(d => d.id === destinationId);

        set(state => ({
          likedDestinations: state.likedDestinations.filter(d => d.id !== destinationId),
          error: null
        }));

        // Track analytics event
        trackAnalyticsEvent('destination_unliked', {
          destinationId,
          sessionId: get().sessionId || '',
          count: get().likedDestinations.length,
          timestamp: new Date()
        });

        // Remove from backend
        if (destination) {
          removeLikedDestination(destinationId);
        }
      },

      clearLiked: () => {
        set({ likedDestinations: [], error: null });
      },

      completeSession: async (): Promise<CompleteSessionResponse> => {
        const state = get();
        const sessionTracker = getGlobalSessionTracker();

        if (!state.sessionId) {
          throw new Error('No session ID available');
        }

        set({ isLoading: true, error: null });

        try {
          // End the review phase
          if (sessionTracker.getCurrentPhase() === 'review') {
            sessionTracker.endPhase('review');
          }

          const sessionTiming = sessionTracker.getPhaseBreakdown();
          const finalSelections = state.likedDestinations.map(d => d.id);

          const response = await fetch(`${API_BASE}/${state.sessionId}/complete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              finalSelections,
              sessionTiming,
              completedAt: new Date()
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to complete session: ${response.statusText}`);
          }

          const result: CompleteSessionResponse = await response.json();

          // Track analytics event
          trackAnalyticsEvent('session_completed', {
            sessionId: state.sessionId,
            count: finalSelections.length,
            sessionTiming,
            timestamp: new Date()
          });

          set({ isLoading: false });
          return result;

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      loadLikedDestinations: async (sessionId: string): Promise<void> => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`${API_BASE}/${sessionId}/liked`);

          if (!response.ok) {
            throw new Error(`Failed to load liked destinations: ${response.statusText}`);
          }

          const data = await response.json();

          set({
            likedDestinations: data.destinations || [],
            isLoading: false
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load liked destinations';
          set({ error: errorMessage, isLoading: false });
        }
      },

      getLikedCount: () => get().likedDestinations.length,

      isDestinationLiked: (destinationId: string) =>
        get().likedDestinations.some(d => d.id === destinationId),

      getLikedDestination: (destinationId: string) =>
        get().likedDestinations.find(d => d.id === destinationId),
    }),
    {
      name: 'nextspot-liked-destinations',
      partialize: (state) => ({
        likedDestinations: state.likedDestinations,
        sessionId: state.sessionId
      }),
    }
  )
);

// Helper function to persist liked destination to backend
async function persistLikedDestination(destination: LikedDestination): Promise<void> {
  const { sessionId } = useLikedStore.getState();

  if (!sessionId) {
    console.warn('[LikedStore] No session ID available for persisting liked destination');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/${sessionId}/liked`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destinationId: destination.id,
        likedAt: destination.likedAt,
        swipeVelocity: destination.swipeVelocity,
        viewDurationMs: destination.viewDurationMs,
        swipeAction: destination.swipeAction,
        swipeDirection: destination.swipeDirection
      }),
    });

    if (!response.ok) {
      console.error('[LikedStore] Failed to persist liked destination:', response.statusText);
    }
  } catch (error) {
    console.error('[LikedStore] Error persisting liked destination:', error);
  }
}

// Helper function to remove liked destination from backend
async function removeLikedDestination(destinationId: string): Promise<void> {
  const { sessionId } = useLikedStore.getState();

  if (!sessionId) {
    console.warn('[LikedStore] No session ID available for removing liked destination');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/${sessionId}/liked/${destinationId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      console.error('[LikedStore] Failed to remove liked destination:', response.statusText);
    }
  } catch (error) {
    console.error('[LikedStore] Error removing liked destination:', error);
  }
}

// Helper function for analytics tracking
function trackAnalyticsEvent(event: LikedDestinationAnalytics['event'], data: Omit<LikedDestinationAnalytics, 'event'>): void {
  const analyticsData: LikedDestinationAnalytics = {
    event,
    ...data
  };

  // Log to console for development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] ${event}:`, analyticsData);
  }

  // In production, this would integrate with your analytics service
  // For example: PostHog, Google Analytics, etc.
  if (typeof window !== 'undefined') {
    // Example: window.posthog?.capture(event, analyticsData);

    // For now, we'll use a custom event that can be caught by analytics tools
    window.dispatchEvent(new CustomEvent('nextspot-analytics', {
      detail: analyticsData
    }));
  }
}

// Hook for easy access to liked destinations functionality
export function useLikedDestinations() {
  const store = useLikedStore();

  return {
    likedDestinations: store.likedDestinations,
    likedCount: store.getLikedCount(),
    isLoading: store.isLoading,
    error: store.error,

    addLiked: store.addLiked,
    removeLiked: store.removeLiked,
    clearLiked: store.clearLiked,
    isDestinationLiked: store.isDestinationLiked,
    getLikedDestination: store.getLikedDestination,
    completeSession: store.completeSession,
    setSessionId: store.setSessionId,
  };
}