import { NextRequest, NextResponse } from "next/server";
import { generateRequestId } from "@/utils/request-id";
import { prisma } from "@/lib/prisma";

// Use Node.js runtime for this API route
export const runtime = "nodejs";

export interface RecommendationItem {
  id: string;
  nameTh: string;
  nameEn: string;
  descTh: string;
  imageUrl: string;
  tags: string[];
  budgetBand: "low" | "mid" | "high";
  latitude?: number;
  longitude?: number;
  address?: string;
  district?: string;
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

type DatabaseDestination = {
  id: string;
  nameTh: string;
  nameEn: string;
  descTh: string;
  imageUrl: string;
  tags: string[];
  budgetBand: "LOW" | "MID" | "HIGH";
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  district?: string | null;
};

/**
 * Convert database destination to recommendation item format
 */
function toRecommendationItem(
  destination: DatabaseDestination
): RecommendationItem {
  return {
    id: destination.id,
    nameTh: destination.nameTh,
    nameEn: destination.nameEn,
    descTh: destination.descTh,
    imageUrl: destination.imageUrl,
    tags: destination.tags,
    budgetBand: destination.budgetBand.toLowerCase() as "low" | "mid" | "high",
    latitude: destination.latitude ? Number(destination.latitude) : undefined,
    longitude: destination.longitude ? Number(destination.longitude) : undefined,
    address: destination.address || undefined,
    district: destination.district || undefined,
  };
}

/**
 * Get user preferences from database
 */
async function getUserPreferences(sessionId: string) {
  try {
    const preferences = await prisma.userPreferences.findUnique({
      where: { sessionId },
    });

    if (!preferences) {
      return null;
    }

    return {
      budgetBand: preferences.budgetBand.toLowerCase(),
      timeWindow: preferences.timeWindow.toLowerCase(),
      moodTags: preferences.moodTags.map((tag) => tag.toLowerCase()),
    };
  } catch (error) {
    console.error("Failed to fetch user preferences:", error);
    return null;
  }
}

/**
 * Get destinations from database with optional filtering and exclude already swiped destinations
 */
async function getDestinationsFromDatabase(
  preferences?: any,
  sessionId?: string,
  onlyExcludeLiked = false
): Promise<RecommendationItem[]> {
  try {
    let whereClause: any = {
      isActive: true,
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
        console.log(`Filtering by user ID: ${session.userId} (authenticated)`);
      } else {
        // For guest users: only exclude from current session
        swipeFilter = { sessionId };
        console.log(`Filtering by session ID: ${sessionId} (guest)`);
      }

      // If onlyExcludeLiked is true, only exclude LIKE actions, allowing SKIP to be shown again
      if (onlyExcludeLiked) {
        swipeFilter.action = "LIKE";
      }

      const swipedDestinations = await prisma.swipeEvent.findMany({
        where: swipeFilter,
        select: { destinationId: true },
      });

      const swipedDestinationIds = swipedDestinations.map(
        (event: any) => event.destinationId
      );

      if (swipedDestinationIds.length > 0) {
        whereClause.id = {
          notIn: swipedDestinationIds,
        };
      }

      const excludeType = onlyExcludeLiked ? "liked" : "already-swiped";
      const userType = session?.userId && !session.isGuest ? "authenticated user" : "guest session";
      console.log(
        `Excluding ${swipedDestinationIds.length} ${excludeType} destinations for ${userType} (${sessionId})`
      );
    }

    // Apply preference-based filtering
    if (preferences) {
      if (preferences.budgetBand) {
        whereClause.budgetBand = preferences.budgetBand.toUpperCase();
      }

      if (preferences.moodTags && preferences.moodTags.length > 0) {
        // Check if any of the user's mood tags match destination tags
        // Note: destination tags are stored as lowercase strings in the database
        whereClause.tags = {
          hasSome: preferences.moodTags,
        };
      }
    }

    console.log(
      "Database query WHERE clause:",
      JSON.stringify(whereClause, null, 2)
    );

    const destinations = await prisma.destination.findMany({
      where: whereClause,
      orderBy: {
        updatedAt: "desc", // Simple ordering, could be improved with popularity scores
      },
      take: 20, // Limit to reasonable number
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

    console.log(`Found ${destinations.length} destinations from database`);

    return destinations.map((dest: any) =>
      toRecommendationItem(dest as DatabaseDestination)
    );
  } catch (error) {
    console.error("Failed to fetch destinations from database:", error);
    return [];
  }
}

/**
 * Get popular recommendations fallback with session-based exclusion
 */
async function getPopularRecommendations(
  sessionId?: string,
  onlyExcludeLiked = false
): Promise<RecommendationItem[]> {
  try {
    // Call the new popular recommendations endpoint with sessionId for duplicate prevention
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    let url = `${baseUrl}/api/recommendations/popular?limit=10`;
    if (sessionId) {
      url += `&sessionId=${sessionId}`;
    }
    if (onlyExcludeLiked) {
      url += `&includeSkipped=true`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Popular recommendations API failed: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error(
      "Failed to fetch popular recommendations, using database fallback:",
      error
    );

    // Database fallback - use database with session exclusion
    return await getDestinationsFromDatabase(undefined, sessionId);
  }
}

/**
 * Main recommendation logic using database
 */
async function getRecommendations(
  sessionId: string,
  preferences: any,
  onlyExcludeLiked = false
): Promise<{ items: RecommendationItem[]; isFastMode: boolean }> {
  const startTime = Date.now();

  try {
    // Step 1: Get filtered destinations from database based on preferences
    const filtered = await getDestinationsFromDatabase(preferences, sessionId, onlyExcludeLiked);

    // Step 2: Check if we have enough results
    let isFastMode = false;
    let finalItems = filtered;

    if (filtered.length < 3) {
      // Not enough filtered results, use popular fallback with session exclusion
      const popular = await getPopularRecommendations(sessionId, onlyExcludeLiked);
      finalItems = popular.slice(0, 10);
      isFastMode = true;

      console.log("[Analytics] recs_request:", {
        sessionId,
        message: "Not enough filtered results, using popular fallback",
        filteredCount: filtered.length,
      });
    } else {
      finalItems = filtered.slice(0, 12); // Limit to 12 items

      console.log("[Analytics] recs_request:", {
        sessionId,
        filteredCount: filtered.length,
        preferences,
      });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (process.env.NODE_ENV === "development") {
      console.log("[Analytics] recs_response:", {
        sessionId,
        count: finalItems.length,
        duration: `${duration}ms`,
        isFastMode,
        preferences,
      });
    }

    return { items: finalItems, isFastMode };
  } catch (error) {
    console.error("Recommendation generation failed:", error);

    // Fallback to popular recommendations with session exclusion
    const popular = await getPopularRecommendations(sessionId, onlyExcludeLiked);
    return { items: popular.slice(0, 10), isFastMode: true };
  }
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<RecommendationsResponse | ErrorResponse>> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const includeSkipped = searchParams.get("includeSkipped") === "true";

    if (!sessionId) {
      const errorResponse: ErrorResponse = {
        error: {
          code: "BAD_REQUEST",
          message: "sessionId query parameter is required",
        },
        request_id: requestId,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Get user preferences
    let preferences = await getUserPreferences(sessionId);

    // If no preferences found, use default/popular recommendations with session exclusion
    if (!preferences) {
      const items = await getPopularRecommendations(sessionId, includeSkipped);
      const response: RecommendationsResponse = {
        items: items.slice(0, 10),
        isFastMode: true,
        request_id: requestId,
      };

      if (process.env.NODE_ENV === "development") {
        console.log("[Analytics] recs_request:", {
          sessionId,
          message: "No preferences found, using popular fallback",
        });
      }

      return NextResponse.json(response, { status: 200 });
    }

    // Get recommendations based on preferences
    const result = await getRecommendations(sessionId, preferences, includeSkipped);

    const response: RecommendationsResponse = {
      items: result.items,
      isFastMode: result.isFastMode,
      request_id: requestId,
    };

    const duration = Date.now() - startTime;

    // Log final response analytics
    if (process.env.NODE_ENV === "development") {
      console.log("[Analytics] recs_api_response:", {
        sessionId,
        totalDuration: `${duration}ms`,
        itemCount: result.items.length,
        isFastMode: result.isFastMode,
        requestId,
      });
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error in recommendations API:", error);

    const errorResponse: ErrorResponse = {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get recommendations",
      },
      request_id: requestId,
    };

    // Log error analytics
    if (process.env.NODE_ENV === "development") {
      console.log("[Analytics] recs_api_error:", {
        error: error instanceof Error ? error.message : "Unknown error",
        requestId,
      });
    }

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
