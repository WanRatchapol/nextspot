import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-secret-change-in-production"
);

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const sessionId = request.cookies.get("sid")?.value;

    if (token) {
      try {
        // Verify and decode the token to get session info
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const userId = payload.userId as string;

        // Mark user sessions as inactive/expired
        await prisma.session.updateMany({
          where: {
            userId,
            isGuest: false,
          },
          data: {
            lastActiveAt: new Date(),
            expiresAt: new Date(), // Expire immediately
          },
        });
      } catch (tokenError) {
        // Token invalid or expired, but we still clear the cookie
        console.warn("Invalid token during logout:", tokenError);
      }
    }

    // Also expire the specific session if we have the session ID
    if (sessionId) {
      try {
        await prisma.session.update({
          where: { id: sessionId },
          data: {
            expiresAt: new Date(), // Expire immediately
            lastActiveAt: new Date(),
          },
        });
      } catch (sessionError) {
        console.warn("Could not expire session during logout:", sessionError);
      }
    }

    // Create response and clear the auth cookie
    const response = NextResponse.json(
      { message: "Logged out successfully" },
      { status: 200 }
    );

    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Immediately expire the cookie
      path: "/",
    });

    // Also clear the session cookie
    response.cookies.set("sid", "", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Immediately expire the cookie
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}