import { NextRequest, NextResponse } from 'next/server';
import { generateRequestId } from '@/utils/request-id';
import { destinations, Destination } from '@/data/destinations.seed';
import { filterDestinations, sortByPopularity, getFilterMetrics, PreferencesFilter } from '@/lib/recs/filter';
import { applyDiversityRule } from '@/lib/recs/diversify';
import { withCache } from '@/lib/recs/cache';

// Use Node.js runtime for this API route
export const runtime = 'nodejs';

export interface RecommendationItem {
  id: string;
  nameTh: string;
  nameEn: string;
  descTh: string;
  imageUrl: string;
  tags: string[];
}

export interface RecommendationsResponse {
  items: RecommendationItem[];
  isFastMode?: boolean;
  request_id: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
  request_id: string;
}

/**
 * Convert destination to recommendation item format
 */
function toRecommendationItem(destination: Destination): RecommendationItem {
  return {
    id: destination.id,
    nameTh: destination.nameTh,
    nameEn: destination.nameEn,
    descTh: destination.descTh,
    imageUrl: destination.imageUrl,
    tags: destination.tags
  };
}

/**
 * Get user preferences from session API (stub for now)
 */
async function getUserPreferences(sessionId: string): Promise<PreferencesFilter | null> {
  // TODO: In real implementation, this would call the preferences API
  // For now, return default preferences for demo purposes
  // This is a placeholder that will be replaced when session storage is implemented
  return null;
}

/**
 * Get popular recommendations fallback (calls S-06 endpoint)
 */
async function getPopularRecommendations(): Promise<RecommendationItem[]> {
  try {
    // Call the new popular recommendations endpoint
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/recommendations/popular?limit=10`);

    if (!response.ok) {
      throw new Error(`Popular recommendations API failed: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];

  } catch (error) {
    console.error('Failed to fetch popular recommendations, using local fallback:', error);

    // Local fallback if the API call fails
    const popular = destinations
      .slice()
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, 10)
      .map(toRecommendationItem);

    return popular;
  }
}

/**
 * Main recommendation logic
 */
async function getRecommendations(
  sessionId: string,
  preferences: PreferencesFilter
): Promise<{ items: RecommendationItem[]; isFastMode: boolean }> {
  const startTime = Date.now();

  try {
    // Step 1: Filter destinations based on preferences
    const filtered = filterDestinations(destinations, preferences);

    // Step 2: Sort by popularity
    const sorted = sortByPopularity(filtered);

    // Step 3: Apply diversity rule
    const diversified = applyDiversityRule(sorted);

    // Step 4: Convert to response format and limit to reasonable number
    const items = diversified.slice(0, 12).map(toRecommendationItem);

    // Step 5: Check if we need fallback
    let isFastMode = false;
    let finalItems = items;

    if (items.length < 6) {
      // Not enough filtered results, use popular fallback
      const popular = await getPopularRecommendations();
      finalItems = popular.slice(0, 10);
      isFastMode = true;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Log analytics
    const metrics = getFilterMetrics(destinations, filtered, preferences);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] recs_request:', {
        sessionId,
        filterCounts: {
          total: metrics.total,
          filtered: metrics.filtered,
          budgetMatches: metrics.budgetMatches,
          timeMatches: metrics.timeMatches,
          moodMatches: metrics.moodMatches
        },
        preferences: metrics.preferences
      });

      console.log('[Analytics] recs_response:', {
        sessionId,
        count: finalItems.length,
        duration: `${duration}ms`,
        isFastMode,
        requestId: generateRequestId()
      });
    }

    return { items: finalItems, isFastMode };

  } catch (error) {
    console.error('Error in getRecommendations:', error);

    // Fallback to popular on any error
    const popular = await getPopularRecommendations();
    return { items: popular.slice(0, 10), isFastMode: true };
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<RecommendationsResponse | ErrorResponse>> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'BAD_REQUEST',
          message: 'sessionId query parameter is required'
        },
        request_id: requestId
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Get user preferences
    let preferences = await getUserPreferences(sessionId);

    // If no preferences found, use default/popular recommendations
    if (!preferences) {
      const items = await getPopularRecommendations();
      const response: RecommendationsResponse = {
        items: items.slice(0, 10),
        isFastMode: true,
        request_id: requestId
      };

      if (process.env.NODE_ENV === 'development') {
        console.log('[Analytics] recs_request:', {
          sessionId,
          message: 'No preferences found, using popular fallback'
        });
      }

      return NextResponse.json(response, { status: 200 });
    }

    // Use cache wrapper for the main recommendation logic
    const result = await withCache(
      () => getRecommendations(sessionId, preferences!),
      sessionId,
      preferences
    );

    const response: RecommendationsResponse = {
      items: result.items,
      isFastMode: result.isFastMode,
      request_id: requestId
    };

    const duration = Date.now() - startTime;

    // Log final response analytics
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] recs_api_response:', {
        sessionId,
        totalDuration: `${duration}ms`,
        itemCount: result.items.length,
        isFastMode: result.isFastMode,
        requestId
      });
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error in recommendations API:', error);

    const errorResponse: ErrorResponse = {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get recommendations'
      },
      request_id: requestId
    };

    // Log error analytics
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] recs_api_error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId
      });
    }

    return NextResponse.json(errorResponse, { status: 500 });
  }
}