import { useState, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  // Pull user object too — we need user.role to conditionally show the Admin link
  const { token, user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/home");
  };

  // Inline horizontal nav links shown on the topbar
  const topLinks = [
    { label: "DASHBOARD", path: "/dashboard", auth: true },
    { label: "DISCOVER", path: "/discover", auth: false },
    { label: "SEARCH", path: "/search", auth: false },
    { label: "PROFILE", path: "/profile", auth: true },
  ].filter((l) => (l.auth ? !!token : true));

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <>
      {/* Top bar */}
      <nav className="topbar">
        <Link
          to="/home"
          className="topbar-logo"
          onClick={(e) => {
            // If already on /home, just scroll back to the top instead of
            // navigating (which would be a no-op and feel broken).
            if (location.pathname === "/home") {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
        >
          [ ♪ MIXTAPE ]
        </Link>

        <div className={`topbar-links ${menuOpen ? "is-hidden" : ""}`}>
          {topLinks.map((l) => (
            <button
              key={l.path}
              className={`topbar-link ${isActive(l.path) ? "active" : ""}`}
              onClick={() => navigate(l.path)}
            >
              {l.label}
            </button>
          ))}
        </div>

        <button
          className={`topbar-menu-btn ${menuOpen ? "is-open" : ""}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? (
            <svg width="40" height="40" viewBox="0 0 47 47" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="45" height="45" rx="22.5" fill="white" stroke="white" strokeWidth="2"/>
              <line x1="17" y1="17" x2="30" y2="30" stroke="black" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="30" y1="17" x2="17" y2="30" stroke="black" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="40" height="40" viewBox="0 0 47 47" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="45" height="45" rx="22.5" stroke="currentColor" strokeWidth="2"/>
              <circle cx="17.5" cy="23.5" r="2.5" fill="currentColor"/>
              <circle cx="28.5" cy="23.5" r="2.5" fill="currentColor"/>
            </svg>
          )}
        </button>
      </nav>

      {/* Full-screen overlay */}
      <div className={`nav-overlay ${menuOpen ? "open" : ""}`}>
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
          <span className="nav-footer-link" onClick={() => handleNav("/about")}>ABOUT</span>
          <span className="nav-footer-link" onClick={() => handleNav("/contact")}>CONTACT</span>
          <span className="nav-footer-link">FAQ</span>
        </div>
      </div>
    </>
  );
}
