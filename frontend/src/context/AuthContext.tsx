import { createContext, useContext, useEffect, useState } from "react";
import { useGoogleLogin, type CodeResponse } from "@react-oauth/google";
import { buildApiUrl } from "../lib/api";

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: "admin" | "student" | "faculty" | null;
  userName: string | null;
  userId: string | null;
  authLoading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<
    "admin" | "student" | "faculty" | null
  >(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  // authLoading stays true until the /auth/role check completes, so the UI
  // doesn't flash a "logged out" state before the token is validated.
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (!token) {
        setAuthLoading(false);
        return;
      }

      // Optimistically apply the cached role immediately to prevent flicker
      try {
        if (storedUser) {
          const cachedUser = JSON.parse(storedUser);
          if (cachedUser?.role) {
            setIsAuthenticated(true);
            setUserRole(cachedUser.role);
            setUserName(cachedUser.name ?? null);
            setUserId(cachedUser._id ?? null);
          }
        }
      } catch (err) {
        console.warn("Malformed cached user data:", err);
      }

      try {
        const res = await fetch(buildApiUrl("/auth/role"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401 || res.status === 403 || res.status === 404) {
          // Explicit rejection from server - session is invalid
          throw new Error("Session expired or invalid");
        }

        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(true);
          setUserRole(data.role);

          // Update cache with latest role from server
          try {
            const cachedUser = JSON.parse(localStorage.getItem("user") ?? "{}");
            const updatedUser = { ...cachedUser, role: data.role };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            setUserName(updatedUser.name ?? null);
            setUserId(updatedUser._id ?? null);
          } catch {
            // Non-critical cache update failure
          }
        }
      } catch (err) {
        console.warn("Token validation failed:", err);
        // Only logout if we are sure the token is invalid (optional check)
        // For now, if the check fails explicitly (like 401), we clear state.
        if (err instanceof Error && err.message === "Session expired or invalid") {
          logout();
        }
      } finally {
        setAuthLoading(false);
      }
    };

    validateToken();
  }, []);

  const googleLogin = useGoogleLogin({
    onSuccess: async (codeResponse: CodeResponse) => {
      try {
        const response = await fetch(buildApiUrl("/auth/google"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: codeResponse.code,
          }),
        });

        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();
        if (data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));

          setIsAuthenticated(true);
          setUserRole(data.user?.role ?? null);
          setUserName(data.user?.name ?? null);
          setUserId(data.user?._id ?? null);
        }
      } catch (error) {
        console.error("Login failed:", error);
      }
    },
    flow: "auth-code",
    onError: (errorResponse) => console.error("Login Failed:", errorResponse),
  });

  const login = () => {
    googleLogin();
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setUserRole(null);
    setUserName(null);
    setUserId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole,
        userName,
        userId,
        authLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
