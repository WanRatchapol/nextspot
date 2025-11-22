import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateRequestId } from "@/utils/request-id";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Validation schemas
const LikedDestinationSchema = z.object({
  destinationId: z.string().min(1),
  likedAt: z.string().datetime(),
  swipeVelocity: z.number().optional(),
  viewDurationMs: z.number().optional(),
  swipeAction: z.enum(["like", "skip", "detail_tap"]),
  swipeDirection: z.enum(["left", "right", "tap"]),
});

const AddLikedDestinationRequestSchema = LikedDestinationSchema;

/**
 * GET /api/sessions/[sessionId]/liked
 * Retrieve all liked destinations for a session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const requestId = generateRequestId();
  const { sessionId } = await params;

  try {
    console.log("Getting liked destinations", { requestId, sessionId });

    // Validate session exists in database
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json(
        {
          error: { code: "SESSION_NOT_FOUND", message: "Session not found" },
          request_id: requestId,
        },
        { status: 404 }
      );
    }

    // 1) Get all LIKE events - for authenticated users, get from all their sessions
    let likedSwipeEvents;
    if (session.userId) {
      // For authenticated users: get all liked destinations from all their sessions
      console.log("Getting liked destinations for authenticated user:", session.userId);
      likedSwipeEvents = await prisma.swipeEvent.findMany({
        where: {
          action: "LIKE",
          session: {
            userId: session.userId
          }
        },
        include: { destination: true },
        orderBy: { timestamp: "desc" },
      });
    } else {
      // For guest users: only get from current session
      console.log("Getting liked destinations for guest session:", sessionId);
      likedSwipeEvents = await prisma.swipeEvent.findMany({
        where: { sessionId, action: "LIKE" },
        include: { destination: true },
        orderBy: { timestamp: "desc" },
      });
    }

    // 2) Dedupe by destination.id (keep the first = most recent)
    const seen = new Set<string>();
    const uniqueEvents = [];
    for (const ev of likedSwipeEvents) {
      const destId = ev.destination.id;
      if (!seen.has(destId)) {
        seen.add(destId);
        uniqueEvents.push(ev);
      }
    }

    // 3) Map to response format
    const destinations = uniqueEvents.map((event) => ({
      id: event.destination.id,
      nameTh: event.destination.nameTh,
      nameEn: event.destination.nameEn,
      descTh: event.destination.descTh,
      imageUrl: event.destination.imageUrl,
      budgetBand: event.destination.budgetBand.toLowerCase(),
      tags: event.destination.tags,
      // Include location data from database
      latitude: event.destination.latitude ? Number(event.destination.latitude) : undefined,
      longitude: event.destination.longitude ? Number(event.destination.longitude) : undefined,
      address: event.destination.address || undefined,
      district: event.destination.district || undefined,
      likedAt: event.timestamp,
      swipeVelocity: event.velocity
        ? parseFloat(event.velocity.toString())
        : undefined,
      viewDurationMs: event.viewDurationMs,
      swipeAction: event.action.toLowerCase(),
      swipeDirection: event.direction.toLowerCase(),
    }));

    // Calculate session timing from database
    const sessionAnalytics = await prisma.sessionAnalytics.findUnique({
      where: { sessionId },
    });

    const sessionTiming = {
      preferencesMs: 30000, // TODO: Calculate from session start to first swipe
      swipingMs: sessionAnalytics?.sessionDuration
        ? sessionAnalytics.sessionDuration * 1000
        : 0,
      reviewMs: 0, // Will be calculated in real-time
      totalMs: sessionAnalytics?.sessionDuration
        ? sessionAnalytics.sessionDuration * 1000 + 30000
        : 150000,
    };

    const response = {
      destinations,
      count: destinations.length,
      sessionTiming,
      success: true,
    };

    console.log("Liked destinations retrieved", {
      requestId,
      sessionId,
      count: destinations.length,
      destinations: destinations.map(d => ({ id: d.id, nameTh: d.nameTh, likedAt: d.likedAt }))
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to get liked destinations", {
      requestId,
      sessionId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
        request_id: requestId,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions/[sessionId]/liked
 * Add a destination to the liked list
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const requestId = generateRequestId();
  const { sessionId } = await params;

  try {
    console.log("Adding liked destination", { requestId, sessionId });

    // Validate session exists in database
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json(
        {
          error: { code: "SESSION_NOT_FOUND", message: "Session not found" },
          request_id: requestId,
        },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = AddLikedDestinationRequestSchema.parse(body);

    // Check if destination exists in database
    const destination = await prisma.destination.findUnique({
      where: { id: validatedData.destinationId },
    });

    if (!destination) {
      return NextResponse.json(
        {
          error: {
            code: "DESTINATION_NOT_FOUND",
            message: "Destination not found",
          },
          request_id: requestId,
        },
        { status: 404 }
      );
    }

    // Check if already liked (has a 'LIKE' swipe event)
    let existingLike;
    if (session.userId) {
      // For authenticated users: check across all their sessions
      existingLike = await prisma.swipeEvent.findFirst({
        where: {
          destinationId: validatedData.destinationId,
          action: "LIKE",
          session: {
            userId: session.userId
          }
        },
      });
    } else {
      // For guest users: only check current session
      existingLike = await prisma.swipeEvent.findFirst({
        where: {
          sessionId,
          destinationId: validatedData.destinationId,
          action: "LIKE",
        },
      });
    }

    if (existingLike) {
      return NextResponse.json(
        {
          error: {
            code: "ALREADY_LIKED",
            message: "Destination already liked",
          },
          request_id: requestId,
        },
        { status: 409 }
      );
    }

    // Create swipe event with LIKE action
    const swipeEvent = await prisma.swipeEvent.create({
      data: {
        sessionId,
        destinationId: validatedData.destinationId,
        action: "LIKE",
        direction: validatedData.swipeDirection.toUpperCase() as
          | "LEFT"
          | "RIGHT"
          | "TAP",
        timestamp: new Date(validatedData.likedAt),
        velocity: validatedData.swipeVelocity,
        viewDurationMs: validatedData.viewDurationMs,
      },
    });

    console.log("Liked destination added", {
      requestId,
      sessionId,
      destinationId: validatedData.destinationId,
      swipeEventId: swipeEvent.id,
    });

    return NextResponse.json(
      {
        id: swipeEvent.id,
        destinationId: validatedData.destinationId,
        success: true,
        request_id: requestId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to add liked destination", {
      requestId,
      sessionId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: error.issues,
          },
          request_id: requestId,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
        request_id: requestId,
      },
      { status: 500 }
    );
  }
}
