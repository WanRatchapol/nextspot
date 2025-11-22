import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { DeviceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// JWT secret from environment
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-secret-change-in-production"
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || null,
        hashedPassword,
        language: "th", // Default to Thai
        notificationsEnabled: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        language: true,
        notificationsEnabled: true,
        createdAt: true,
      },
    });

    // Create JWT token
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d") // Token expires in 7 days
      .sign(JWT_SECRET);

    // Check for existing guest session to link
    const existingSessionId = request.cookies.get("sid")?.value;
    let session;

    if (existingSessionId) {
      // Try to link existing guest session
      const existingSession = await prisma.session.findUnique({
        where: { id: existingSessionId },
      });

      if (existingSession && existingSession.isGuest) {
        // Link the existing guest session to the user
        session = await prisma.session.update({
          where: { id: existingSessionId },
          data: {
            userId: user.id,
            isGuest: false,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
          select: {
            id: true,
            expiresAt: true,
          },
        });

        // Update preferences to link to user if they exist
        await prisma.userPreferences.updateMany({
          where: { sessionId: existingSessionId },
          data: { userId: user.id },
        });
      } else {
        // Create new session if existing one is not a guest session
        const userAgent = request.headers.get("user-agent") || "unknown";
        const deviceType: DeviceType = userAgent.includes("Mobile")
          ? DeviceType.MOBILE
          : userAgent.includes("Tablet")
          ? DeviceType.TABLET
          : DeviceType.DESKTOP;

        session = await prisma.session.create({
          data: {
            userId: user.id,
            userAgent,
            deviceType,
            isGuest: false,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
          select: {
            id: true,
            expiresAt: true,
          },
        });
      }
    } else {
      // Create new session if no existing session
      const userAgent = request.headers.get("user-agent") || "unknown";
      const deviceType: DeviceType = userAgent.includes("Mobile")
        ? DeviceType.MOBILE
        : userAgent.includes("Tablet")
        ? DeviceType.TABLET
        : DeviceType.DESKTOP;

      session = await prisma.session.create({
        data: {
          userId: user.id,
          userAgent,
          deviceType,
          isGuest: false,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
        select: {
          id: true,
          expiresAt: true,
        },
      });
    }

    const response = NextResponse.json(
      {
        message: "User created successfully",
        user,
        sessionId: session.id,
      },
      { status: 201 }
    );

    // Set both auth token and session cookie
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: "/",
    });

    response.cookies.set("sid", session.id, {
      httpOnly: false, // Allow JavaScript access for client-side session management
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}