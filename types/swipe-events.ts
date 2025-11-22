// Shared TypeScript interfaces for swipe events API
// Based on S-08 Swipe Events API requirements

// Core swipe event data structure
export interface SwipeEventData {
  sessionId: string;
  destinationId: string;
  action: SwipeAction;
  direction: SwipeDirection;
  velocity?: number; // px/ms
  durationMs?: number; // milliseconds
  viewDurationMs?: number; // milliseconds
  clientTimestamp?: string; // ISO datetime string
}

// API request/response types
export interface SwipeEventRequest extends SwipeEventData {}

export interface SwipeEventResponse {
  eventId: string;
  batchId?: string; // Present if batch was immediately processed
  request_id: string;
  recorded: boolean;
}

// Enums for type safety
export type SwipeAction = 'like' | 'skip' | 'detail_tap';
export type SwipeDirection = 'left' | 'right' | 'tap';

// Error response structure
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
  request_id: string;
}

// Real-time analytics aggregation interfaces
export interface SwipeAnalyticsData {
  destinationId: string;
  date: string; // ISO date string
  likeCount: number;
  skipCount: number;
  detailTapCount: number;
  avgViewDuration?: number; // seconds
  avgSwipeVelocity?: number; // px/ms
}

export interface SessionAnalyticsData {
  sessionId: string;
  totalSwipes: number;
  likeRate?: number; // percentage as decimal (0.0-1.0)
  avgDecisionTime?: number; // seconds
  sessionDuration?: number; // seconds
  completedAt?: string; // ISO datetime string
}

// Batch processing status for monitoring
export interface BatchStatus {
  batchQueue: {
    length: number;
    maxSize: number;
    timeoutMs: number;
    hasPendingTimeout: boolean;
  };
  system: {
    timestamp: string;
    status: string;
  };
}

// Database model interfaces (for backend use)
export interface SwipeEventModel {
  id: string;
  sessionId: string;
  destinationId: string;
  action: SwipeAction;
  timestamp: Date;
  direction: SwipeDirection;
  velocity?: number;
  durationMs?: number;
  viewDurationMs?: number;
  batchId?: string;
  processedAt?: Date;
}

// Client-side tracking interface for frontend components
export interface SwipeTracker {
  recordSwipe: (data: Omit<SwipeEventData, 'sessionId'>) => Promise<void>;
  setSessionId: (sessionId: string) => void;
  getSessionId: () => string | null;
}

// Performance monitoring interfaces
export interface SwipeEventMetrics {
  eventCount: number;
  avgProcessingTime: number; // milliseconds
  errorRate: number; // percentage
  batchProcessingRate: number; // batches per minute
}

export interface PerformanceTarget {
  maxEventRecordingTime: 100; // ms (S-08 requirement)
  maxBatchProcessingTime: 500; // ms (S-08 requirement)
  maxErrorRate: 0.01; // 1%
  maxBatchSize: 100; // events
  batchTimeoutMs: 5000; // 5 seconds
}

// Client-side gesture data capture
export interface GestureData {
  startTime: number;
  endTime: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  velocity?: number;
  distance?: number;
}

// Frontend component props interfaces
export interface SwipeCardProps {
  destination: DestinationData;
  onSwipe: (direction: SwipeDirection, data: GestureData) => void;
  onDetailTap: () => void;
  sessionId: string;
}

export interface DestinationData {
  id: string;
  nameTh: string;
  nameEn: string;
  descTh: string;
  imageUrl: string;
  budgetBand: 'low' | 'mid' | 'high';
  tags: string[];
}

// Analytics dashboard interfaces
export interface DashboardMetrics {
  totalEvents: number;
  likeRate: number;
  avgDecisionTime: number;
  topDestinations: Array<{
    id: string;
    name: string;
    likeCount: number;
    likeRate: number;
  }>;
  performanceMetrics: SwipeEventMetrics;
}