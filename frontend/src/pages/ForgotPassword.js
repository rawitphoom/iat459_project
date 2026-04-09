import { useState } from "react";
import { Link } from "react-router-dom";

/*
 * ForgotPassword — password reset request page.
 * Route: /forgot-password
 *
 * The backend returns a temporary reset token in this project setup, and this
 * page turns that token into a reset link for the next step of the flow.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [resetToken, setResetToken] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResetToken("");

    try {
      const res = await fetch("http://localhost:5001/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setResetToken(data.resetToken);
    } catch {
      setError("Server unavailable");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Brand header: shared auth shell used across sign-in / register / reset pages. */}
        <div className="auth-logo">
          <img src="/logo.svg" alt="Mixtape" className="auth-logo-img" />
          <div className="auth-logo-text">
            <span className="auth-logo-title">MIXTAPE</span>
            <span className="auth-logo-sub">Your music collection</span>
          </div>
        </div>

        <h1 className="auth-heading">FORGOT PASSWORD</h1>
        <p className="auth-subheading">Enter your email or username to reset your password.</p>

        {/* Error state for invalid accounts or backend failures. */}
        {error && <div className="auth-error">{error}</div>}

        {/* Swap the form for a success panel once a reset token has been issued. */}
        {resetToken ? (
          <div className="auth-success">
            <p>Reset token generated! Use the link below to reset your password.</p>
            <Link to={`/reset-password?token=${resetToken}`} className="auth-reset-link">
              Reset Password
            </Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-label">EMAIL / USERNAME</label>
            <input
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email or username"
            />

            <button className="auth-submit" type="submit">SEND RESET LINK</button>
          </form>
        )}

        {/* Escape hatch back to login if the user remembers their password. */}
        <p className="auth-switch">
          Remember your password?{" "}
          <Link to="/login" className="auth-switch-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
