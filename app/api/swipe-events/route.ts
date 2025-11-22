import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateRequestId } from "@/utils/request-id";
import { analyticsAggregator } from "@/utils/analytics-aggregator";
import { prisma } from "@/lib/prisma";

// Use Node.js runtime for database access
export const runtime = "nodejs";

// Zod validation schema for swipe event payload based on S-08 requirements
const SwipeEventRequestSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  destinationId: z.string().min(1, "Destination ID is required"),
  action: z.enum(["like", "skip", "detail_tap"]),
  direction: z.enum(["left", "right", "tap"]),
  velocity: z.number().min(0).optional(),
  durationMs: z.number().int().min(0).optional(),
  viewDurationMs: z.number().int().min(0).optional(),
  // Client timestamp for accurate timing (server will also record its own)
  clientTimestamp: z.string().datetime().optional(),
});

export type SwipeEventRequest = z.infer<typeof SwipeEventRequestSchema>;

export interface SwipeEventResponse {
  eventId: string;
  batchId?: string;
  request_id: string;
  recorded: boolean;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
  request_id: string;
}

// Batch processing queue (in-memory for MVP, would use Redis/Queue in production)
const eventBatch: Array<
  SwipeEventRequest & { requestId: string; serverTimestamp: Date }
> = [];
const BATCH_SIZE = 100;
const BATCH_TIMEOUT_MS = 5000; // 5 seconds

let batchTimeout: NodeJS.Timeout | null = null;

// Function to process batch and save to database
async function processBatch() {
  if (eventBatch.length === 0) return;

  const currentBatch = eventBatch.splice(0, eventBatch.length);
  const batchId = generateRequestId(); // Use as batch ID

  try {
    console.log(
      `[Analytics] Processing batch ${batchId} with ${currentBatch.length} events`
    );

    // Insert batch into database using Prisma transaction
    await prisma.$transaction(async (tx) => {
      for (const event of currentBatch) {
        await tx.swipeEvent.create({
          data: {
            sessionId: event.sessionId,
            destinationId: event.destinationId,
            action: event.action.toUpperCase() as
              | "LIKE"
              | "SKIP"
              | "DETAIL_TAP",
            direction: event.direction.toUpperCase() as
              | "LEFT"
              | "RIGHT"
              | "TAP",
            velocity: event.velocity ? event.velocity : null,
            durationMs: event.durationMs,
            viewDurationMs: event.viewDurationMs,
            timestamp: event.serverTimestamp,
            batchId,
            processedAt: new Date(),
          },
        });
      }
    });

    // Log batch completion metrics
    console.log(`[Analytics] Batch ${batchId} processed successfully`, {
      eventCount: currentBatch.length,
      processingTime: Date.now() - currentBatch[0].serverTimestamp.getTime(),
      batchId,
    });
  } catch (error) {
    console.error(`[Analytics] Batch processing failed for ${batchId}:`, error);

    // TODO: In production, implement retry logic and dead letter queue
    // For now, we'll just log the failure
    console.error(
      `[Analytics] Failed batch ${batchId} events:`,
      currentBatch.map((e) => e.requestId)
    );
  }
}

// Schedule batch processing
function scheduleBatchProcessing() {
  if (batchTimeout) {
    clearTimeout(batchTimeout);
  }

  batchTimeout = setTimeout(async () => {
    await processBatch();
    batchTimeout = null;
  }, BATCH_TIMEOUT_MS);
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<SwipeEventResponse | ErrorResponse>> {
  const requestId = generateRequestId();
  const serverTimestamp = new Date();

  try {
    const body = await request.json();

    // Validate the request payload with Zod
    const validationResult = SwipeEventRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");

      const errorResponse: ErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: errorMessage,
        },
        request_id: requestId,
      };

      // Log validation error for monitoring
      console.log("[Analytics] swipe_event_validation_error:", {
        error: errorMessage,
        requestId,
        body: JSON.stringify(body),
      });

      return NextResponse.json(errorResponse, { status: 400 });
    }

    const eventData = validationResult.data;

    const requiresImmediatePersist =
      eventData.action === "like" || eventData.action === "skip";

    if (requiresImmediatePersist) {
      // write-through
      const swipeEvent = await prisma.swipeEvent.create({
        data: {
          sessionId: eventData.sessionId,
          destinationId: eventData.destinationId,
          action: eventData.action.toUpperCase() as "LIKE" | "SKIP",
          direction: eventData.direction.toUpperCase() as "LEFT" | "RIGHT",
          velocity: eventData.velocity ?? null,
          durationMs: eventData.durationMs,
          viewDurationMs: eventData.viewDurationMs,
          timestamp: serverTimestamp,
          batchId: null,
          processedAt: new Date(),
        },
      });

      console.log(`[SwipeEvents] ${eventData.action.toUpperCase()} event saved:`, {
        swipeEventId: swipeEvent.id,
        sessionId: eventData.sessionId,
        destinationId: eventData.destinationId,
        action: eventData.action,
        timestamp: serverTimestamp.toISOString()
      });

      analyticsAggregator.recordEvent(eventData);

      // short-circuit response (don’t enqueue)
      return NextResponse.json(
        {
          eventId: generateRequestId(),
          request_id: requestId,
          recorded: true,
        },
        {
          status: 201,
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
        }
      );
    }

    // Validate action/direction consistency
    if (eventData.action === "like" && eventData.direction !== "right") {
      const errorResponse: ErrorResponse = {
        error: {
          code: "INVALID_ACTION_DIRECTION",
          message: "Like action must have right direction",
        },
        request_id: requestId,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (eventData.action === "skip" && eventData.direction !== "left") {
      const errorResponse: ErrorResponse = {
        error: {
          code: "INVALID_ACTION_DIRECTION",
          message: "Skip action must have left direction",
        },
        request_id: requestId,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (eventData.action === "detail_tap" && eventData.direction !== "tap") {
      const errorResponse: ErrorResponse = {
        error: {
          code: "INVALID_ACTION_DIRECTION",
          message: "Detail tap action must have tap direction",
        },
        request_id: requestId,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate session exists in database
    const session = await prisma.session.findUnique({
      where: { id: eventData.sessionId },
    });

    if (!session) {
      const errorResponse: ErrorResponse = {
        error: {
          code: "SESSION_NOT_FOUND",
          message: "Session not found",
        },
        request_id: requestId,
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Validate destination exists in database
    const destination = await prisma.destination.findUnique({
      where: { id: eventData.destinationId },
    });

    if (!destination) {
      const errorResponse: ErrorResponse = {
        error: {
          code: "DESTINATION_NOT_FOUND",
          message: "Destination not found",
        },
        request_id: requestId,
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Record event in real-time analytics aggregator
    analyticsAggregator.recordEvent(eventData);

    // Add to batch processing queue
    const batchEvent = {
      ...eventData,
      requestId,
      serverTimestamp,
    };

    eventBatch.push(batchEvent);

    // Generate event ID for response
    const eventId = generateRequestId();

    // Check if batch is full and needs immediate processing
    if (eventBatch.length >= BATCH_SIZE) {
      // Process immediately when batch is full
      setImmediate(processBatch);
    } else {
      // Schedule batch processing for timeout
      scheduleBatchProcessing();
    }

    // Log successful event capture
    console.log("[Analytics] swipe_event_captured:", {
      eventId,
      sessionId: eventData.sessionId,
      destinationId: eventData.destinationId,
      action: eventData.action,
      direction: eventData.direction,
      batchSize: eventBatch.length,
      requestId,
    });

    // Return success response immediately (fire-and-forget for performance)
    const response: SwipeEventResponse = {
      eventId,
      batchId: eventBatch.length >= BATCH_SIZE ? requestId : undefined,
      request_id: requestId,
      recorded: true,
    };

    return NextResponse.json(response, {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error processing swipe event:", error);

    const errorResponse: ErrorResponse = {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to record swipe event",
      },
      request_id: requestId,
    };

    // Log server error for monitoring
    console.log("[Analytics] swipe_event_server_error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      requestId,
      timestamp: serverTimestamp,
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Health check endpoint for batch processing monitoring
export async function GET(): Promise<NextResponse> {
  const response = {
    batchQueue: {
      length: eventBatch.length,
      maxSize: BATCH_SIZE,
      timeoutMs: BATCH_TIMEOUT_MS,
      hasPendingTimeout: batchTimeout !== null,
    },
    system: {
      timestamp: new Date().toISOString(),
      status: "healthy",
    },
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
