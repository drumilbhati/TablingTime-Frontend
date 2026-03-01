import "./App.css";
import Navbar from "./components/Navbar.tsx";
import { Route, Routes, Navigate } from "react-router-dom";
import Login from "./pages/Login.tsx";
import TimetablePage from "./pages/TimetablePage.tsx";
import ClassroomsPage from "./pages/ClassroomsPage.tsx";
import OccupiedRooms from "./pages/OccupiedRooms.tsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./context/AuthContext.tsx";
import { CoursesProvider } from "./context/CoursesContext.tsx";
import { useAuth } from "./context/AuthContext.tsx";

// Redirects non-admin users away from admin-only routes.
// Shows nothing while auth is still loading to avoid a flash redirect.
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, userRole, authLoading } = useAuth();

  if (authLoading) return null;

  if (!isAuthenticated || userRole !== "admin") {
    return <Navigate to="/timetable" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <GoogleOAuthProvider clientId="169828270266-4rvkkr0t2p9l1l8g74akau8k5e4peprn.apps.googleusercontent.com">
      <AuthProvider>
        <CoursesProvider>
          <div className="min-h-screen">
            <Navbar />
            <Routes>
              <Route path="/" element={<Navigate to="/timetable" replace />} />
              <Route path="/timetable" element={<TimetablePage />} />
              <Route
                path="/classrooms"
                element={
                  <AdminRoute>
                    <ClassroomsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/occupied"
                element={
                  <AdminRoute>
                    <OccupiedRooms />
                  </AdminRoute>
                }
              />
              <Route path="/login" element={<Login />} />
            </Routes>
          </div>
        </CoursesProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
