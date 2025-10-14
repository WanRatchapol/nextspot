import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSessionId, generateRequestId } from '@/utils/request-id';
import { detectDeviceType } from '@/utils/analytics';

export const runtime = 'nodejs';

const CreateSessionRequestSchema = z.object({
  userAgent: z.string().min(1),
  deviceType: z.enum(['mobile', 'tablet', 'desktop']),
});

const CreateSessionResponseSchema = z.object({
  sessionId: z.string(),
  expiresAt: z.string(),
  requestId: z.string(),
});

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    // Parse request body
    const body = await request.json();
    const validatedBody = CreateSessionRequestSchema.parse(body);

    // Generate session ID and expiration
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create response
    const responseData = CreateSessionResponseSchema.parse({
      sessionId,
      expiresAt: expiresAt.toISOString(),
      requestId,
    });

    // Set HttpOnly cookie
    const response = NextResponse.json(responseData, { status: 201 });
    response.cookies.set('sid', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    });

    // Log session creation
    console.log('Session created', {
      requestId,
      sessionId,
      userAgent: validatedBody.userAgent,
      deviceType: validatedBody.deviceType,
      expiresAt: expiresAt.toISOString(),
    });

    return response;
  } catch (error) {
    console.error('Session creation failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    // Get session ID from cookie
    const sessionId = request.cookies.get('sid')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    // For MVP, we'll just validate the session ID format
    // In a real implementation, this would check the database
    if (!sessionId.startsWith('sess_')) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    console.log('Session validated', {
      requestId,
      sessionId,
    });

    return NextResponse.json({
      sessionId,
      valid: true,
      requestId,
    });
  } catch (error) {
    console.error('Session validation failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}