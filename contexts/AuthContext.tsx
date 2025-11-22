"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePreferencesStore } from "@/lib/stores/preferences";

interface User {
  id: string;
  email: string;
  name: string | null;
  profileImage: string | null;
  language: string;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const clearPersistedData = usePreferencesStore((state) => state.clearPersistedData);

  const refreshUser = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
      setUser(null);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    // Clear any guest preferences from store/localStorage before setting user
    // This ensures fresh start for authenticated user
    clearPersistedData();

    setUser(data.user);
  };

  const register = async (email: string, password: string, name?: string) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, name }),
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Registration failed");
    }

    // For register, we don't clear the store because register should transfer guest data
    // The backend handles linking guest session to new account
    // Just set the user - preferences should transfer from guest session
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);

      // Clear preferences store and its localStorage cache
      clearPersistedData();

      // Clear any other cached data from localStorage to ensure fresh guest experience
      if (typeof window !== "undefined") {
        // Clear any potential preference or session cache
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('nextspot-') && !key.includes('intro-seen')) {
            localStorage.removeItem(key);
          }
        });
      }
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}