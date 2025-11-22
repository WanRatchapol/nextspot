import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const LinkUserRequestSchema = z.object({
  sessionId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = LinkUserRequestSchema.parse(body);

    // Get current authenticated user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Find the guest session
    const guestSession = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        preferences: true,
        swipeEvents: true,
      },
    });

    if (!guestSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (!guestSession.isGuest) {
      return NextResponse.json(
        { error: "Session is already linked to a user" },
        { status: 400 }
      );
    }

    // Start transaction to link session and transfer data
    await prisma.$transaction(async (tx) => {
      // Update session to link to user
      await tx.session.update({
        where: { id: sessionId },
        data: {
          userId: currentUser.id,
          isGuest: false,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days for authenticated
        },
      });

      // Update preferences to link to user if they exist
      if (guestSession.preferences) {
        await tx.userPreferences.update({
          where: { id: guestSession.preferences.id },
          data: {
            userId: currentUser.id,
          },
        });
      }

      // Update any swipe events to maintain analytics
      if (guestSession.swipeEvents.length > 0) {
        // Note: Swipe events are already linked to session, so no update needed
        // But we could create user-level analytics here if needed
      }
    });

    return NextResponse.json(
      {
        message: "Session successfully linked to user account",
        sessionId,
        userId: currentUser.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Session linking failed:", error);

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