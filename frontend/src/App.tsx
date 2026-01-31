import "./App.css";
import Navbar from "./components/Navbar.tsx";
import { Route, Routes } from "react-router-dom";
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import { GoogleOAuthProvider } from "@react-oauth/google";

function App() {
  return (
    <div>
      <GoogleOAuthProvider clientId="169828270266-4rvkkr0t2p9l1l8g74akau8k5e4peprn.apps.googleusercontent.com">
        <Routes>
          <Route path="/" element={<Dashboard />}></Route>
          <Route path="/login" element={<><Navbar /><Login /></>}></Route>
        </Routes>
      </GoogleOAuthProvider>
    </div>
  );
}

export default App;
