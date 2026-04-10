/*
 * Register.js — account creation page.
 * Route: /register
 *
 * This screen collects the user's basic account information, sends it to the
 * backend auth route, and logs the user in immediately after a successful
 * registration. That keeps the onboarding flow short: sign up once, land in
 * the dashboard, and start using the app right away.
 */

import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import API_URL from "./config";

export default function Register() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      login(data.token);
      navigate("/dashboard");
    } catch {
      setError("Server unavailable");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Brand block: keeps the auth pages visually tied to the main product. */}
        <div className="auth-logo">
          <img src="/logo.svg" alt="Mixtape" className="auth-logo-img" />
          <div className="auth-logo-text">
            <span className="auth-logo-title">MIXTAPE</span>
            <span className="auth-logo-sub">Your music collection</span>
          </div>
        </div>

        <h1 className="auth-heading">CREATE YOUR ACCOUNT</h1>

        {/* Inline error surface for duplicate usernames, invalid data, or server issues. */}
        {error && <div className="auth-error">{error}</div>}

        {/* Main registration form. Each field maps directly to the backend payload. */}
        <form className="auth-form" onSubmit={handleRegister}>
          <label className="auth-label">NAME</label>
          <input
            className="auth-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name"
          />

          <label className="auth-label">USERNAME</label>
          <input
            className="auth-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
          />

          <label className="auth-label">EMAIL</label>
          <input
            className="auth-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
          />

          <label className="auth-label">PASSWORD</label>
          <input
            className="auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />

          <button className="auth-submit" type="submit">SIGN UP</button>
        </form>

        {/* Secondary route for returning users who already have an account. */}
        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login" className="auth-switch-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
