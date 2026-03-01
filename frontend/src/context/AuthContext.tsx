import { createContext, useContext, useEffect, useState } from "react";
import { useGoogleLogin, type CodeResponse } from "@react-oauth/google";

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: "admin" | "student" | "faculty" | null;
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

  // on mount, rehydrate auth state from localStorage
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw);
        setIsAuthenticated(true);
        setUserRole(user?.role ?? null);
      } catch {
        setIsAuthenticated(false);
        setUserRole(null);
      }
    }
  }, []);

  const googleLogin = useGoogleLogin({
    onSuccess: async (codeResponse: CodeResponse) => {
      try {
        console.log("Auth Code received:", codeResponse.code);

        // 2. Send the 'code' to your backend
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/auth/google`, // Match your backend route
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code: codeResponse.code,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();
        if (data.token) {
          // Save to localStorage
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));

          setIsAuthenticated(true);
          setUserRole(data.user?.role);
        }
        console.log("Login returned data: ", data);
      } catch (error) {
        console.error("Login failed:", error);
      }
    },
    flow: "auth-code", // Required to get the 'code' your backend wants
    onError: (errorResponse) => console.error("Login Failed:", errorResponse),
  });

  const login = () => {
    googleLogin();
  };

  const logout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be available inside AuthProvider");
  return ctx;
};
