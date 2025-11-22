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
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        hashedPassword: true,
        language: true,
        notificationsEnabled: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d") // Token expires in 7 days
      .sign(JWT_SECRET);

    // Create new session for login (don't link guest data)
    const userAgent = request.headers.get("user-agent") || "unknown";
    const deviceType: DeviceType = userAgent.includes("Mobile")
      ? DeviceType.MOBILE
      : userAgent.includes("Tablet")
      ? DeviceType.TABLET
      : DeviceType.DESKTOP;

    const session = await prisma.session.create({
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

    // Return user data without password
    const { hashedPassword, ...userWithoutPassword } = user;

    // Set HTTP-only cookie for the token
    const response = NextResponse.json(
      {
        message: "Login successful",
        user: userWithoutPassword,
        sessionId: session.id,
      },
      { status: 200 }
    );

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: "/",
    });

    // Set session cookie for frontend compatibility
    response.cookies.set("sid", session.id, {
      httpOnly: false, // Allow JavaScript access for client-side session management
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
