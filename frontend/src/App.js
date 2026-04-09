/*
 * App.js — Root of the application.
 *
 * This file wires together every route in the app and wraps everything in
 * the AuthProvider (so any component can access the logged-in user/token)
 * and BrowserRouter (so React Router's Link/navigate work everywhere).
 *
 * Key behaviours:
 *  - The app always starts at the IntroPage ("/") on a fresh load or page
 *    refresh, even if the user typed a different URL directly.
 *  - Once the user clicks "Enter" on the intro, sessionStorage records that
 *    they've entered and subsequent navigations skip the intro.
 *  - The Navbar is hidden on the IntroPage so the full-screen splash looks clean.
 *  - Protected routes (/dashboard, /create-mixtape, etc.) require a valid JWT;
 *    ProtectedRoute handles the redirect to /login if none is found.
 */

import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import Navbar from "./components/Navbar";
import MusicToggle from "./components/MusicToggle";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

import Login from "./Login";
import Register from "./Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./Dashboard";
import LandingPage from "./pages/LandingPage";
import IntroPage from "./pages/IntroPage";
import PublicAlbums from "./PublicAlbums";
import AdminDashboard from "./pages/AdminDashboard";
import AlbumDetail from "./pages/AlbumDetail";
import ProfilePage from "./pages/ProfilePage";
import CreateMixtape from "./pages/CreateMixtape";
import PlaylistDetail from "./pages/PlaylistDetail";
import WriteReview from "./pages/WriteReview";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";

/*
 * AppLayout — the inner shell that sits inside BrowserRouter.
 * We need this separate from App() because hooks like useLocation/useNavigate
 * can only be called inside a Router context, which BrowserRouter provides.
 */
function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide the Navbar on the splash/intro page so it doesn't overlap the full-screen design.
  const showSiteChrome = location.pathname !== "/";

  // The floating music toggle button only makes sense on the landing/home page.
  const hideMusicButton = location.pathname !== "/home";

  /*
   * On mount, check how this page load happened using the Navigation API.
   * - "reload"        → user hit F5 / cmd-R, so we wipe the session flag and
   *                     force them back through the intro.
   * - fresh navigate  → first visit, no session flag yet, send to intro.
   * - "back_forward"  → browser back/forward button, let them stay where they are.
   * We use replace:true so the intro isn't stacked onto the history unnecessarily.
   */
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

        {/* informational pages */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* discover = browse albums */}
        <Route path="/discover" element={<PublicAlbums />} />

        {/* search = track search */}
        <Route path="/search" element={<PublicAlbums />} />

        {/* Album detail — shows full track list from Deezer */}
        <Route path="/album/:id" element={<AlbumDetail />} />

        {/* Playlist/Mixtape detail */}
        <Route path="/playlist/:id" element={<PlaylistDetail />} />

        {/* Profile — own profile (requires login) or view another user */}
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/profile/:id" element={<ProfilePage />} />

        {/* public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* protected route | if there a token show Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Create Mixtape — full page form (protected) */}
        <Route
          path="/create-mixtape"
          element={
            <ProtectedRoute>
              <CreateMixtape />
            </ProtectedRoute>
          }
        />

        <Route
          path="/write-review"
          element={
            <ProtectedRoute>
              <WriteReview />
            </ProtectedRoute>
          }
        />

        {/* Admin route — wrapped in ProtectedRoute so it requires a token.
            The AdminDashboard component itself also checks user.role === "admin"
            and redirects non-admins back to /home. */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

/*
 * App — the actual default export. Wraps everything in AuthProvider so the
 * logged-in user and token are available anywhere in the tree, then drops in
 * BrowserRouter to enable client-side routing.
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}
