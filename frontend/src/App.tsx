import "./App.css";
import Navbar from "./components/Navbar.tsx";
import { Route, Routes } from "react-router-dom";
import Login from "./pages/Login.tsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Dashbord from "./pages/Dashboard.tsx";

function App() {
  return (
    <div>
      <GoogleOAuthProvider clientId="169828270266-4rvkkr0t2p9l1l8g74akau8k5e4peprn.apps.googleusercontent.com">
        <Navbar />
        <main className="content-main">
          <Routes>
            <Route path="/" element={<Dashbord />}></Route>
            <Route path="/login" element={<Login />}></Route>
          </Routes>
        </main>
      </GoogleOAuthProvider>
    </div>
  );
}

export default App;
