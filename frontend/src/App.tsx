import "./App.css";
import Navbar from "./components/Navbar.tsx";
import { Route, Routes } from "react-router-dom";
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import OccupiedRooms from "./pages/OccupiedRooms.tsx";

function App() {
  return (
    <GoogleOAuthProvider clientId="169828270266-4rvkkr0t2p9l1l8g74akau8k5e4peprn.apps.googleusercontent.com">
      <div className="min-h-screen">
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />}></Route>
          <Route path="/login" element={<Login />}></Route>
          <Route path="/classrooms" element={<OccupiedRooms />}></Route>
        </Routes>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
