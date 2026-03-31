import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import Navbar from "./components/Navbar";
import MusicToggle from "./components/MusicToggle";

import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";
import LandingPage from "./pages/LandingPage";
import PublicAlbums from "./PublicAlbums";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <MusicToggle />
        <Routes>
          {/* public landing page */}
          <Route path="/" element={<LandingPage />} />

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
      </BrowserRouter>
    </AuthProvider>
  );
}
