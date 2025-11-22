import { NextRequest, NextResponse } from 'next/server';
import { generateRequestId } from '@/utils/request-id';
import { prisma } from '@/lib/prisma';
import { RecommendationItem } from '../route';

// Use Node.js runtime for database access
export const runtime = 'nodejs';

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

type DatabaseDestination = {
  id: string;
  nameTh: string;
  nameEn: string;
  descTh: string;
  imageUrl: string;
  tags: string[];
  budgetBand: 'LOW' | 'MID' | 'HIGH';
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  district?: string | null;
};

/**
 * Convert database destination to recommendation item format
 */
function toRecommendationItem(destination: DatabaseDestination): RecommendationItem {
  return {
    id: destination.id,
    nameTh: destination.nameTh,
    nameEn: destination.nameEn,
    descTh: destination.descTh,
    imageUrl: destination.imageUrl,
    tags: destination.tags,
    budgetBand: destination.budgetBand.toLowerCase() as 'low' | 'mid' | 'high',
    latitude: destination.latitude ? Number(destination.latitude) : undefined,
    longitude: destination.longitude ? Number(destination.longitude) : undefined,
    address: destination.address || undefined,
    district: destination.district || undefined,
  };
}

/**
 * Get popular recommendations from database with optional tag filtering and duplicate prevention
 */
async function getPopularRecommendations(limit: number, tags: string[] = [], sessionId?: string, onlyExcludeLiked = false): Promise<RecommendationItem[]> {
  const startTime = Date.now();

  try {
    let whereClause: any = {
      isActive: true
    };

    // Exclude destinations that user has already swiped on
    if (sessionId) {
      // First, get the session to check if it belongs to an authenticated user
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { userId: true, isGuest: true }
      });

      let swipeFilter: any;

      if (session?.userId && !session.isGuest) {
        // For authenticated users: exclude from ALL their sessions
        swipeFilter = {
          session: {
            userId: session.userId
          }
        };
        console.log(`[Popular] Filtering by user ID: ${session.userId} (authenticated)`);
      } else {
        // For guest users: only exclude from current session
        swipeFilter = { sessionId };
        console.log(`[Popular] Filtering by session ID: ${sessionId} (guest)`);
      }

      // If onlyExcludeLiked is true, only exclude LIKE actions, allowing SKIP to be shown again
      if (onlyExcludeLiked) {
        swipeFilter.action = "LIKE";
      }

      const swipedDestinations = await prisma.swipeEvent.findMany({
        where: swipeFilter,
        select: { destinationId: true }
      });

      const swipedDestinationIds = swipedDestinations.map((event: any) => event.destinationId);

      if (swipedDestinationIds.length > 0) {
        whereClause.id = {
          notIn: swipedDestinationIds
        };
      }

      const excludeType = onlyExcludeLiked ? "liked" : "already-swiped";
      const userType = session?.userId && !session.isGuest ? "authenticated user" : "guest session";
      console.log(`[Popular] Excluding ${swipedDestinationIds.length} ${excludeType} destinations for ${userType} (${sessionId})`);
      console.log(`[Popular] WHERE clause:`, whereClause);
    }

    // Apply tag filtering if provided
    if (tags.length > 0) {
      whereClause.tags = {
        hasSome: tags.map(tag => tag.toLowerCase())
      };
    }

    // Get destinations from database, ordered by popularity (using updatedAt as proxy for now)
    const destinations = await prisma.destination.findMany({
      where: whereClause,
      orderBy: [
        { updatedAt: 'desc' }, // Most recently updated = more popular
        { createdAt: 'desc' }  // Then by creation date
      ],
      take: limit,
      select: {
        id: true,
        nameTh: true,
        nameEn: true,
        descTh: true,
        imageUrl: true,
        tags: true,
        budgetBand: true,
        latitude: true,
        longitude: true,
        address: true,
        district: true,
      },
    });

    const result = destinations.map((dest: any) => toRecommendationItem(dest as DatabaseDestination));

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Server-side analytics logging
    if (process.env.NODE_ENV === 'development') {
      const requestId = generateRequestId();

      console.log('[Analytics] popular_recs_request:', {
        limit,
        tags: tags.join(',') || 'none',
        sessionId: sessionId || 'none',
        request_id: requestId
      });

      console.log('[Analytics] popular_recs_response:', {
        count: result.length,
        ms: duration,
        request_id: requestId
      });
    }

    return result;

  } catch (error) {
    console.error('Failed to fetch popular recommendations from database:', error);
    return [];
  }
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

    // Parse sessionId parameter for duplicate prevention
    const sessionId = searchParams.get('sessionId');
    const includeSkipped = searchParams.get('includeSkipped') === 'true';

    // Get popular recommendations with optional session-based exclusion
    const items = await getPopularRecommendations(limit, tags, sessionId || undefined, includeSkipped);

    const response: PopularRecommendationsResponse = {
      items,
      request_id: requestId
    };

    // Set caching headers for database performance
    const headers = {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
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