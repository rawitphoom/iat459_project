import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import Navbar from "./components/Navbar";
import MusicToggle from "./components/MusicToggle";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";
import LandingPage from "./pages/LandingPage";
import IntroPage from "./pages/IntroPage";
import PublicAlbums from "./PublicAlbums";

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const showSiteChrome = location.pathname !== "/";
  const hideMusicButton = location.pathname === "/";

  useEffect(() => {
    const navigationEntry = performance.getEntriesByType("navigation")[0];
    const navigationType = navigationEntry ? navigationEntry.type : "navigate";

    // Reset the intro flow on a full refresh.
    if (navigationType === "reload") {
      sessionStorage.removeItem("hasEnteredSite");
    }

    // On a fresh load, always start from the intro page first.
    if (
      navigationType !== "back_forward" &&
      location.pathname !== "/" &&
      !sessionStorage.getItem("hasEnteredSite")
    ) {
      navigate("/", { replace: true });
    }
  }, []);

  return (
    <>
      {showSiteChrome ? <Navbar /> : null}
      <MusicToggle hidden={hideMusicButton} />
      <Routes>
        {/* intro page before entering the site */}
        <Route path="/" element={<IntroPage />} />

        {/* public landing page */}
        <Route path="/home" element={<LandingPage />} />

        {/* discover = browse albums */}
        <Route path="/discover" element={<PublicAlbums />} />

        {/* search = track search */}
        <Route path="/search" element={<PublicAlbums />} />

        {/* public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* protected route | if there a token show Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}
