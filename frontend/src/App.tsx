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
              <Route path="/classrooms" element={<ClassroomsPage />} />
              <Route path="/occupied" element={<OccupiedRooms />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </div>
        </CoursesProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
