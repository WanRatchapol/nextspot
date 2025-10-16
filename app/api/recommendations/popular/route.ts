import { NextRequest, NextResponse } from 'next/server';
import { generateRequestId } from '@/utils/request-id';
import { destinations } from '@/data/destinations.seed';
import { RecommendationItem } from '../route';

// Use Edge runtime for optimal performance
export const runtime = 'edge';

export interface PopularRecommendationsResponse {
  items: RecommendationItem[];
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
function toRecommendationItem(destination: any): RecommendationItem {
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
 * Filter destinations by tags (intersection - at least one tag must match)
 */
function filterByTags(destinations: any[], tags: string[]): any[] {
  if (tags.length === 0) return destinations;

  return destinations.filter(destination =>
    destination.tags.some((tag: string) => tags.includes(tag))
  );
}

/**
 * Get popular recommendations with optional tag filtering
 */
function getPopularRecommendations(limit: number, tags: string[] = []): RecommendationItem[] {
  const startTime = Date.now();

  // Sort by popularityScore descending
  let filtered = destinations
    .slice()
    .sort((a, b) => b.popularityScore - a.popularityScore);

  // Apply tag filtering if provided
  if (tags.length > 0) {
    filtered = filterByTags(filtered, tags);
  }

  // Apply limit
  const result = filtered
    .slice(0, limit)
    .map(toRecommendationItem);

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Server-side analytics logging
  if (process.env.NODE_ENV === 'development') {
    const requestId = generateRequestId();

    console.log('[Analytics] popular_recs_request:', {
      limit,
      tags: tags.join(',') || 'none',
      request_id: requestId
    });

    console.log('[Analytics] popular_recs_response:', {
      count: result.length,
      ms: duration,
      request_id: requestId
    });
  }

  return result;
}

export async function GET(request: NextRequest): Promise<NextResponse<PopularRecommendationsResponse | ErrorResponse>> {
  const requestId = generateRequestId();

  try {
    const { searchParams } = new URL(request.url);

    // Parse limit parameter
    const limitParam = searchParams.get('limit');
    let limit = 10; // default

    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);

      if (isNaN(parsedLimit) || parsedLimit < 0) {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'BAD_REQUEST',
            message: 'limit parameter must be a non-negative number'
          },
          request_id: requestId
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }

      // Cap at 12 max
      limit = Math.min(parsedLimit, 12);
    }

    // Parse tags parameter
    const tagsParam = searchParams.get('tags');
    let tags: string[] = [];

    if (tagsParam) {
      tags = tagsParam
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    }

    // Get popular recommendations
    const items = getPopularRecommendations(limit, tags);

    const response: PopularRecommendationsResponse = {
      items,
      request_id: requestId
    };

    // Set aggressive caching headers for Edge performance
    const headers = {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      'Content-Type': 'application/json'
    };

    return NextResponse.json(response, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Error in popular recommendations API:', error);

    const errorResponse: ErrorResponse = {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get popular recommendations'
      },
      request_id: requestId
    };

    // Log error analytics
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] popular_recs_error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        request_id: requestId
      });
    }

    return NextResponse.json(errorResponse, { status: 500 });
  }
}