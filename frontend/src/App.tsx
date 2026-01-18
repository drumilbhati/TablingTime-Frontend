import "./App.css";
import Navbar from "./components/Navbar.tsx";
import { Route, Routes } from "react-router-dom";
import Login from "./pages/Login.tsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Timetable from "./components/Timetable.tsx";

function App() {
  return (
    <div>
      <GoogleOAuthProvider clientId="169828270266-4rvkkr0t2p9l1l8g74akau8k5e4peprn.apps.googleusercontent.com">
        <Navbar />
        <main className="content-main">
          <Routes>
            <Route path="/" element={<Timetable />}></Route>
            <Route path="/login" element={<Login />}></Route>
          </Routes>
        </main>
      </GoogleOAuthProvider>
    </div>
  );
}

export default App;
