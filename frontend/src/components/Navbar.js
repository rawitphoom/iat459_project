import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  // Pull user object too — we need user.role to conditionally show the Admin link
  const { token, user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleNav = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/home");
  };

  return (
    <>
      {/* Top bar */}
      <nav className="topbar">
        <Link to="/home" className="topbar-logo">[ ♪ MIXTAPE ]</Link>
        <button className="topbar-menu-btn" onClick={() => setMenuOpen(true)}>
          [ MENU ]
        </button>
      </nav>

      {/* Full-screen overlay */}
      <div className={`nav-overlay ${menuOpen ? "open" : ""}`}>
        <div className="nav-overlay-header">
          <Link to="/home" className="topbar-logo" onClick={() => setMenuOpen(false)}>
            [ ♪ MIXTAPE ]
          </Link>
          <button className="topbar-menu-btn" onClick={() => setMenuOpen(false)}>
            [ CLOSE ]
          </button>
        </div>

        <div className="nav-overlay-links">
          <button className="nav-overlay-link" onClick={() => handleNav("/search")}>
            <span className="nav-link-text">SEARCH</span>
            <span className="nav-link-arrow"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></span>
          </button>
          <button className="nav-overlay-link" onClick={() => handleNav("/discover")}>
            <span className="nav-link-text">DISCOVER</span>
            <span className="nav-link-arrow"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></span>
          </button>

          {token ? (
            <>
              <button className="nav-overlay-link" onClick={() => handleNav("/profile")}>
                <span className="nav-link-text">PROFILE</span>
                <span className="nav-link-arrow"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></span>
              </button>
              <button className="nav-overlay-link" onClick={() => handleNav("/dashboard")}>
                <span className="nav-link-text">DASHBOARD</span>
                <span className="nav-link-arrow"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></span>
              </button>

              {/* Conditionally show Admin link — only if user.role is "admin".
                  This is purely UX (hiding the button); the backend enforces real security. */}
              {user?.role === "admin" && (
                <button className="nav-overlay-link" onClick={() => handleNav("/admin")}>
                  <span className="nav-link-text">ADMIN</span>
                  <span className="nav-link-arrow"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></span>
                </button>
              )}

              <button className="nav-overlay-link" onClick={handleLogout}>
                <span className="nav-link-text">LOGOUT</span>
                <span className="nav-link-arrow"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></span>
              </button>
            </>
          ) : (
            <>
              <button className="nav-overlay-link" onClick={() => handleNav("/login")}>
                <span className="nav-link-text">SIGN IN</span>
                <span className="nav-link-arrow"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></span>
              </button>
              <button className="nav-overlay-link" onClick={() => handleNav("/register")}>
                <span className="nav-link-text">REGISTER</span>
                <span className="nav-link-arrow"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></span>
              </button>
            </>
          )}
        </div>

        <div className="nav-overlay-footer">
          <span className="nav-footer-link">ABOUT</span>
          <span className="nav-footer-link">CONTACT</span>
          <span className="nav-footer-link">FAQ</span>
        </div>
      </div>
    </>
  );
}
