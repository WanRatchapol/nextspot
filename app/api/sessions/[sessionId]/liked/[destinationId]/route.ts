import { NextRequest, NextResponse } from 'next/server';
import { generateRequestId } from '@/utils/request-id';

export const runtime = 'nodejs';

// Import the same storage from the parent route (in production, this would be a database)
const likedDestinationsStore = new Map<string, Array<{
  id: string;
  destinationId: string;
  likedAt: Date;
  swipeVelocity?: number;
  viewDurationMs?: number;
  swipeAction: string;
  swipeDirection: string;
}>>();

/**
 * DELETE /api/sessions/[sessionId]/liked/[destinationId]
 * Remove a destination from the liked list
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; destinationId: string }> }
) {
  const requestId = generateRequestId();
  const { sessionId, destinationId } = await params;

  try {
    console.log('Removing liked destination', { requestId, sessionId, destinationId });

    // Validate session ID format
    if (!sessionId.startsWith('sess_')) {
      return NextResponse.json(
        { error: { code: 'INVALID_SESSION', message: 'Invalid session ID' }, request_id: requestId },
        { status: 401 }
      );
    }

    // Get liked destinations for this session
    const sessionLiked = likedDestinationsStore.get(sessionId) || [];

    // Find the destination to remove
    const existingIndex = sessionLiked.findIndex(item => item.destinationId === destinationId);

    if (existingIndex === -1) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Destination not found in liked list' }, request_id: requestId },
        { status: 404 }
      );
    }

    // Remove the destination
    const removedItem = sessionLiked.splice(existingIndex, 1)[0];
    likedDestinationsStore.set(sessionId, sessionLiked);

    console.log('Liked destination removed', {
      requestId,
      sessionId,
      destinationId,
      removedId: removedItem.id,
      remainingCount: sessionLiked.length,
    });

    return NextResponse.json({
      destinationId,
      removed: true,
      remainingCount: sessionLiked.length,
      request_id: requestId,
    });

  } catch (error) {
    console.error('Failed to remove liked destination', {
      requestId,
      sessionId,
      destinationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }, request_id: requestId },
      { status: 500 }
    );
  }
}