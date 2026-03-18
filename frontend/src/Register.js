import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:5001/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      navigate("/login");
    } catch {
      setError("Server unavailable");
    }
  };

  return (
    <div className="app-shell auth-shell">
      <header className="auth-header">
        <h1 className="brand">AlbumShelf</h1>
        <p className="welcome">Create your account</p>
      </header>

      <section className="card auth-card">
        <h3>Register</h3>
        <form className="auth-form" onSubmit={handleRegister}>
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
              Create account
            </button>
            {error ? <p className="error-text">{error}</p> : null}
          </div>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
        <p className="auth-footer">
          <Link to="/">Back to albums</Link>
        </p>
      </section>
    </div>
  );
}
