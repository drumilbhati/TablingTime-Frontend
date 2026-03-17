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

      if (!token) {
        // No token stored — definitely logged out, nothing to validate.
        setAuthLoading(false);
        return;
      }

      // Optimistically apply the cached role from localStorage while the
      // network request is in flight, so the navbar doesn't flicker.
      try {
        const cachedUser = JSON.parse(localStorage.getItem("user") ?? "{}");
        if (cachedUser?.role) {
          setIsAuthenticated(true);
          setUserRole(cachedUser.role);
          setUserName(cachedUser.name ?? null);
          setUserId(cachedUser._id ?? null);
        }
      } catch {
        // Ignore malformed cache — the server response is authoritative.
      }

      // Confirm with the server that the token is still valid and get the
      // canonical role (in case it was updated since the token was issued).
      try {
        const res = await fetch(buildApiUrl("/auth/role"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          // 401 = expired/invalid token, 404 = user deleted — either way, log out.
          throw new Error(`Status ${res.status}`);
        }

        const data = await res.json();
        setIsAuthenticated(true);
        setUserRole(data.role);

        // Keep the cached user object's role in sync.
        try {
          const cachedUser = JSON.parse(localStorage.getItem("user") ?? "{}");
          const updatedUser = { ...cachedUser, role: data.role };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setUserName(updatedUser.name ?? null);
          setUserId(updatedUser._id ?? null);
        } catch {
          // Non-critical — best effort cache update.
        }
      } catch (err) {
        console.warn("Token validation failed, logging out:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsAuthenticated(false);
        setUserRole(null);
        setUserName(null);
        setUserId(null);
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
