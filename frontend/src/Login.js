import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:5001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.token) {
        setError(data.error || "Login failed");
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
        <div className="auth-logo">
          <img src="/logo.svg" alt="Mixtape" className="auth-logo-img" />
          <div className="auth-logo-text">
            <span className="auth-logo-title">MIXTAPE</span>
            <span className="auth-logo-sub">Your music collection</span>
          </div>
        </div>

        <h1 className="auth-heading">SIGN IN</h1>
        <p className="auth-subheading">Welcome back,</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleLogin}>
          <label className="auth-label">EMAIL OR USERNAME</label>
          <input
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email or username"
          />

          <label className="auth-label">PASSWORD</label>
          <input
            className="auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />

          <div className="auth-forgot">
            <Link to="/forgot-password" className="auth-forgot-link">Forgot password?</Link>
          </div>

          <button className="auth-submit" type="submit">SIGN IN</button>
        </form>

        <p className="auth-switch">
          Don't have an account?{" "}
          <Link to="/register" className="auth-switch-link">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
