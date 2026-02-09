import "./App.css";
import Navbar from "./components/Navbar.tsx";
import { Route, Routes, Navigate } from "react-router-dom";
import Login from "./pages/Login.tsx";
import TimetablePage from "./pages/TimetablePage.tsx";
import ClassroomsPage from "./pages/ClassroomsPage.tsx";
import OccupiedRooms from "./pages/OccupiedRooms.tsx";
import { GoogleOAuthProvider } from "@react-oauth/google";

function App() {
  return (
    <GoogleOAuthProvider clientId="169828270266-4rvkkr0t2p9l1l8g74akau8k5e4peprn.apps.googleusercontent.com">
      <div className="min-h-screen">
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/timetable" replace />}></Route>
          <Route path="/timetable" element={<TimetablePage />}></Route>
          <Route path="/classrooms" element={<ClassroomsPage />}></Route>
          <Route path="/occupied" element={<OccupiedRooms />}></Route>
          <Route path="/login" element={<Login />}></Route>
        </Routes>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
