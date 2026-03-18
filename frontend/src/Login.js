import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
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
        body: JSON.stringify({ username, password }),
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
    <div className="app-shell auth-shell">
      <header className="auth-header">
        <h1 className="brand">Mixtape.</h1>
        <p className="welcome">Welcome back</p>
      </header>

      <section className="card auth-card">
        <h3>Login</h3>
        <form className="auth-form" onSubmit={handleLogin}>
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          <div className="form-actions auth-actions">
            <button className="primary-btn" type="submit">
              Login
            </button>
            {error ? <p className="error-text">{error}</p> : null}
          </div>
        </form>
        <p className="auth-footer">
          No account? <Link to="/register">Register</Link>
        </p>
        <p className="auth-footer">
          <Link to="/">Back to albums</Link>
        </p>
      </section>
    </div>
  );
}
