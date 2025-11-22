import { NextRequest, NextResponse } from 'next/server';
import { generateRequestId } from '@/utils/request-id';
import { PreferencesSchema } from '@/types/preferences';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const requestId = generateRequestId();
  const { sessionId } = await params;

  try {
    console.log(`[${requestId}] Preferences update requested for session: ${sessionId}`);

    const body = await request.json();

    // Validate preferences with Zod
    const result = PreferencesSchema.safeParse(body);

    if (!result.success) {
      console.error(`[${requestId}] Validation error:`, result.error.issues);
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid preferences data',
            details: result.error.issues
          },
          request_id: requestId
        },
        { status: 400 }
      );
    }

    // Verify session exists and is not expired
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return NextResponse.json(
        {
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found'
          },
          request_id: requestId
        },
        { status: 404 }
      );
    }

    // Check if session is expired
    if (session.expiresAt && session.expiresAt <= new Date()) {
      return NextResponse.json(
        {
          error: {
            code: 'SESSION_EXPIRED',
            message: 'Session has expired'
          },
          request_id: requestId
        },
        { status: 401 }
      );
    }

    // Convert types to match Prisma enums
    const budgetBandEnum = result.data.budgetBand.toUpperCase() as 'LOW' | 'MID' | 'HIGH';
    const timeWindowEnum = result.data.timeWindow.toUpperCase() as 'EVENING' | 'HALFDAY' | 'FULLDAY';
    const moodTagsEnum = result.data.moodTags.map(tag => tag.toUpperCase()) as ('CHILL' | 'ADVENTURE' | 'FOODIE' | 'CULTURAL' | 'SOCIAL' | 'ROMANTIC')[];

    // Save preferences to database (upsert to handle updates)
    // For authenticated users, check if they already have preferences by userId
    if (session.userId) {
      // Try to find existing preferences by userId first
      const existingPrefs = await prisma.userPreferences.findFirst({
        where: { userId: session.userId }
      });

      if (existingPrefs) {
        // Update existing preferences by id
        await prisma.userPreferences.update({
          where: { id: existingPrefs.id },
          data: {
            budgetBand: budgetBandEnum,
            timeWindow: timeWindowEnum,
            moodTags: moodTagsEnum,
            sessionId: sessionId, // Update to current session
            updatedAt: new Date()
          }
        });
      } else {
        // Create new preferences for authenticated user
        await prisma.userPreferences.create({
          data: {
            sessionId,
            budgetBand: budgetBandEnum,
            timeWindow: timeWindowEnum,
            moodTags: moodTagsEnum,
            userId: session.userId
          }
        });
      }
    } else {
      // For guest users, use sessionId-based upsert
      await prisma.userPreferences.upsert({
        where: { sessionId },
        update: {
          budgetBand: budgetBandEnum,
          timeWindow: timeWindowEnum,
          moodTags: moodTagsEnum,
          updatedAt: new Date()
        },
        create: {
          sessionId,
          budgetBand: budgetBandEnum,
          timeWindow: timeWindowEnum,
          moodTags: moodTagsEnum,
          userId: null
        }
      });
    }

    console.log(`[${requestId}] Preferences saved to database:`, {
      sessionId,
      preferences: result.data,
      timestamp: new Date().toISOString()
    });

    // Log analytics
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] preferences_saved:', {
        sessionId,
        budgetBand: result.data.budgetBand,
        moodTags: result.data.moodTags.join(','),
        timeWindow: result.data.timeWindow,
        timestamp: Date.now(),
        requestId
      });
    }

    return NextResponse.json({
      success: true,
      sessionId,
      preferences: result.data,
      savedAt: new Date().toISOString(),
      request_id: requestId
    });

  } catch (error) {
    console.error(`[${requestId}] Error saving preferences:`, error);

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to save preferences'
        },
        request_id: requestId
      },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const requestId = generateRequestId();
  const { sessionId } = await params;

  try {
    console.log(`[${requestId}] Preferences fetch requested for session: ${sessionId}`);

    // First verify session exists and is not expired
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    console.log(`[${requestId}] Session details:`, {
      sessionId,
      userId: session?.userId,
      isGuest: session?.isGuest
    });

    if (!session) {
      return NextResponse.json(
        {
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found'
          },
          request_id: requestId
        },
        { status: 404 }
      );
    }

    // Check if session is expired
    if (session.expiresAt && session.expiresAt <= new Date()) {
      return NextResponse.json(
        {
          error: {
            code: 'SESSION_EXPIRED',
            message: 'Session has expired'
          },
          request_id: requestId
        },
        { status: 401 }
      );
    }

    // Fetch preferences from database
    // For authenticated users, prioritize userId lookup over sessionId
    let preferences = null;
    if (session.userId) {
      console.log(`[${requestId}] Looking for preferences by userId: ${session.userId}`);
      // Try to find by userId first for authenticated users
      preferences = await prisma.userPreferences.findFirst({
        where: { userId: session.userId }
      });
      console.log(`[${requestId}] Found preferences by userId:`, preferences ? 'YES' : 'NO');
    }

    // If not found by userId or session is guest, try sessionId
    if (!preferences) {
      console.log(`[${requestId}] Looking for preferences by sessionId: ${sessionId}`);
      preferences = await prisma.userPreferences.findUnique({
        where: { sessionId }
      });
      console.log(`[${requestId}] Found preferences by sessionId:`, preferences ? 'YES' : 'NO');
    }

    if (!preferences) {
      return NextResponse.json({
        sessionId,
        preferences: null,
        message: 'No preferences found for this session',
        request_id: requestId
      });
    }

    // Convert back to frontend format
    const formattedPreferences = {
      budgetBand: preferences.budgetBand.toLowerCase(),
      timeWindow: preferences.timeWindow.toLowerCase(),
      moodTags: preferences.moodTags.map((tag: string) => tag.toLowerCase())
    };

    return NextResponse.json({
      sessionId,
      preferences: formattedPreferences,
      savedAt: preferences.updatedAt.toISOString(),
      request_id: requestId
    });

  } catch (error) {
    console.error(`[${requestId}] Error fetching preferences:`, error);

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch preferences'
        },
        request_id: requestId
      },
      { status: 500 }
    );
  }
}