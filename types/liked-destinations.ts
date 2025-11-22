// Types for S-09 Liked List & Completion feature
// Extends existing types for liked destinations functionality

import type { DestinationData, SwipeAction, SwipeDirection } from './swipe-events';
import type { SessionBreakdown, SessionTiming } from '../utils/session-timing-tracker';

// Liked destination with additional metadata
export interface LikedDestination extends DestinationData {
  likedAt: Date;
  swipeVelocity?: number;
  viewDurationMs?: number;
  swipeAction: SwipeAction;
  swipeDirection: SwipeDirection;
}

// Component prop interfaces
export interface LikedListProps {
  likedDestinations: LikedDestination[];
  onRemove: (destinationId: string) => void;
  onComplete: () => void;
  onContinueSwiping: () => void;
  sessionTiming: SessionTiming;
}

export interface LikedCounterProps {
  count: number;
  className?: string;
}

export interface LikedDestinationCardProps {
  destination: LikedDestination;
  onRemove: (destinationId: string) => void;
  showRemoveButton?: boolean;
}

export interface LikedGridProps {
  destinations: LikedDestination[];
  onRemove: (destinationId: string) => void;
  showRemoveButtons?: boolean;
}

export interface EmptyLikedStateProps {
  onContinueSwiping: () => void;
}

// API request/response interfaces
export interface LikedDestinationsResponse {
  destinations: LikedDestination[];
  count: number;
  sessionTiming: SessionBreakdown;
  success: boolean;
}

export interface CompleteSessionRequest {
  finalSelections: string[]; // destination IDs
  sessionTiming: SessionBreakdown;
  completedAt: Date;
}

export interface CompleteSessionResponse {
  sessionId: string;
  completedAt: Date;
  finalSelectionCount: number;
  totalSessionTime: number;
  success: boolean;
}

// Zustand store state interface
export interface LikedState {
  likedDestinations: LikedDestination[];

  // Actions
  addLiked: (destination: DestinationData, swipeData: SwipeData) => void;
  removeLiked: (destinationId: string) => void;
  clearLiked: () => void;
  completeSession: () => Promise<CompleteSessionResponse>;

  // Getters
  getLikedCount: () => number;
  isDestinationLiked: (destinationId: string) => boolean;
  getLikedDestination: (destinationId: string) => LikedDestination | undefined;
}

// Swipe data interface for adding liked destinations
export interface SwipeData {
  velocity?: number;
  durationMs?: number;
  viewDurationMs?: number;
  action: SwipeAction;
  direction: SwipeDirection;
}

// Analytics event data
export interface LikedDestinationAnalytics {
  event: 'destination_liked' | 'destination_unliked' | 'liked_list_viewed' | 'session_completed';
  destinationId?: string;
  sessionId: string;
  count?: number;
  sessionTiming?: SessionBreakdown;
  timestamp: Date;
}

// Performance metrics
export interface LikedListPerformanceMetrics {
  loadTime: number; // ms
  removeOperationTime: number; // ms
  statePersistenceTime: number; // ms
  sessionCompletionTime: number; // ms
}

// Validation metrics for MVP
export interface ValidationMetrics {
  averageDecisionTime: number; // ms from preferences to completion
  completionRate: number; // % users who finish flow
  likedDestinationCountDistribution: Record<number, number>; // count -> frequency
  phaseTimeBreakdown: SessionBreakdown;
  returnToSwipingRate: number; // % who return to continue swiping
}

// Error handling
export interface LikedDestinationError {
  code: 'NETWORK_ERROR' | 'STORAGE_ERROR' | 'VALIDATION_ERROR' | 'SESSION_EXPIRED';
  message: string;
  destinationId?: string;
  timestamp: Date;
}