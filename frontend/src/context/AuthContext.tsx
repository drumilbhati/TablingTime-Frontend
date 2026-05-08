import { createContext, useContext, useEffect, useState, useCallback } from "react";
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
  // Initialize state synchronously from localStorage to prevent flicker/logout on reload
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem("token");
  });

  const [userRole, setUserRole] = useState<"admin" | "student" | "faculty" | null>(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) return null;
      const user = JSON.parse(storedUser);
      return user.role || null;
    } catch (e) {
      console.error("Failed to parse stored user role:", e);
      return null;
    }
  });

  const [userName, setUserName] = useState<string | null>(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) return null;
      const user = JSON.parse(storedUser);
      return user.name || null;
    } catch {
      return null;
    }
  });

  const [userId, setUserId] = useState<string | null>(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) return null;
      const user = JSON.parse(storedUser);
      return user._id || null;
    } catch {
      return null;
    }
  });

  // authLoading should only be true if we actually have a token to validate
  const [authLoading, setAuthLoading] = useState<boolean>(() => {
    return !!localStorage.getItem("token");
  });

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setUserRole(null);
    setUserName(null);
    setUserId(null);
  }, []);

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const res = await fetch(buildApiUrl("/auth/role"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401 || res.status === 403) {
          // Explicitly unauthorized - log out
          console.warn("Session expired or unauthorized. Logging out.");
          logout();
          return;
        }

        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(true);
          setUserRole(data.role);

          // Refresh the user object in localStorage if role changed
          try {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
              const cachedUser = JSON.parse(storedUser);
              if (cachedUser.role !== data.role) {
                const updatedUser = { ...cachedUser, role: data.role };
                localStorage.setItem("user", JSON.stringify(updatedUser));
                setUserName(updatedUser.name ?? null);
                setUserId(updatedUser._id ?? null);
              }
            }
          } catch (e) {
            console.error("Failed to update cached user role:", e);
          }
        } else {
          // Other error (e.g. 500, 404) - keep optimistic state if we can't confirm failure
          console.warn(`Token validation returned non-ok status: ${res.status}`);
        }
      } catch (err) {
        // Network error or fetch failed - keep optimistic state to allow offline/transient failure
        console.error("Network error during token validation:", err);
      } finally {
        setAuthLoading(false);
      }
    };

    validateToken();
  }, [logout]);

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
