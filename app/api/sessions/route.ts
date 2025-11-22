import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateRequestId } from "@/utils/request-id";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const CreateSessionRequestSchema = z.object({
  userAgent: z.string().min(1),
  deviceType: z.enum(["mobile", "tablet", "desktop"]),
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

    // Check if user is authenticated
    const currentUser = await getCurrentUser();

    // Create session in database
    const session = await prisma.session.create({
      data: {
        userAgent: validatedBody.userAgent,
        deviceType: validatedBody.deviceType.toUpperCase() as
          | "MOBILE"
          | "TABLET"
          | "DESKTOP",
        userId: currentUser?.id || null,
        isGuest: !currentUser,
        expiresAt: currentUser
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days for authenticated
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days for guest
      },
    });

    // Create response
    const responseData = CreateSessionResponseSchema.parse({
      sessionId: session.id,
      expiresAt: session.expiresAt?.toISOString() || new Date().toISOString(),
      requestId,
    });

    // Set session cookie (accessible to JavaScript for client-side reading)
    const response = NextResponse.json(responseData, { status: 201 });
    response.cookies.set("sid", session.id, {
      httpOnly: false, // Allow JavaScript access for client-side session management
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: "/",
    });

    // Log session creation
    console.log("Session created", {
      requestId,
      sessionId: session.id,
      userAgent: validatedBody.userAgent,
      deviceType: validatedBody.deviceType,
      userId: currentUser?.id || null,
      isGuest: !currentUser,
      expiresAt: session.expiresAt?.toISOString(),
    });

    return response;
  } catch (error) {
    console.error("Session creation failed", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    // Get session ID from cookie
    const sessionId = request.cookies.get("sid")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    // Validate session exists in database
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        preferences: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            language: true,
          },
        },
        _count: {
          select: { swipeEvents: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Check if session is expired
    if (session.expiresAt && session.expiresAt <= new Date()) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    // Update last active timestamp
    await prisma.session.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    });

    console.log("Session validated", {
      requestId,
      sessionId,
      hasPreferences: !!session.preferences,
      swipeCount: session._count.swipeEvents,
      userId: session.user?.id,
      isGuest: session.isGuest,
    });

    return NextResponse.json({
      sessionId,
      valid: true,
      hasPreferences: !!session.preferences,
      swipeCount: session._count.swipeEvents,
      user: session.user,
      isGuest: session.isGuest,
      requestId,
    });
  } catch (error) {
    console.error("Session validation failed", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
