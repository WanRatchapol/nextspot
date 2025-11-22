import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-secret-change-in-production"
);

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  profileImage: string | null;
  language: string;
  notificationsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  user: AuthUser;
  sessionId: string;
  expiresAt: Date;
}

/**
 * Get current authenticated user from JWT token
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as string;

    if (!userId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        profileImage: true,
        language: true,
        notificationsEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

/**
 * Get current session with user data
 */
export async function getCurrentSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as string;

    if (!userId) {
      return null;
    }

    const sessionWithUser = await prisma.session.findFirst({
      where: {
        userId,
        isGuest: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            profileImage: true,
            language: true,
            notificationsEnabled: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        lastActiveAt: "desc",
      },
    });

    if (!sessionWithUser?.user) {
      return null;
    }

    return {
      user: sessionWithUser.user,
      sessionId: sessionWithUser.id,
      expiresAt: sessionWithUser.expiresAt!,
    };
  } catch (error) {
    console.error("Get current session error:", error);
    return null;
  }
}

/**
 * Create a new JWT token for user
 */
export async function createToken(userId: string, email: string): Promise<string> {
  return await new SignJWT({
    userId,
    email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

/**
 * Verify JWT token and return payload
 */
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    throw new Error("Invalid token");
  }
}

/**
 * Create or get guest session
 */
export async function createGuestSession(userAgent: string): Promise<string> {
  const deviceType = userAgent.includes("Mobile")
    ? "MOBILE"
    : userAgent.includes("Tablet")
    ? "TABLET"
    : "DESKTOP";

  const session = await prisma.session.create({
    data: {
      userAgent,
      deviceType: deviceType as "MOBILE" | "TABLET" | "DESKTOP",
      isGuest: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days for guest
    },
  });

  return session.id;
}

/**
 * Link guest session to authenticated user
 */
export async function linkGuestSessionToUser(
  sessionId: string,
  userId: string
): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      userId,
      isGuest: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days for authenticated
    },
  });
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}