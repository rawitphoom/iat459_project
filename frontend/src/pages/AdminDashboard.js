import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

// Admin Dashboard — only accessible to users with role === "admin".
// Fetches ALL users and ALL playlists across the platform.
// Admins can delete any user (and their playlists) or delete individual playlists.

export default function AdminDashboard() {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();

  // State for all users and all playlists on the platform
  const [users, setUsers] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [error, setError] = useState("");

  // Double-check role on mount — if not admin, bounce back to home.
  // Hiding the button in the Navbar is UX only, not security.
  // This protects against someone manually typing /admin in the URL bar.
  useEffect(() => {
    if (user?.role !== "admin") {
      navigate("/home", { replace: true });
      return;
    }

    // Fetch all users and all playlists in parallel
    fetchUsers();
    fetchPlaylists();
  }, [user, token, navigate]);

  // ---- Fetch all users (admin-only endpoint) ----
  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // If the server returns 403, the user is not actually an admin
      if (res.status === 403) {
        setError("Access denied — you are not an admin.");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to load users");
        return;
      }
      setUsers(data);
    } catch {
      setError("Server unavailable");
    }
  };

  // ---- Fetch all playlists (admin-only endpoint) ----
  const fetchPlaylists = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/admin/playlists", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) return; // already handled above
      const data = await res.json();
      if (res.ok) setPlaylists(data);
    } catch {
      // silently fail — user error already shown from fetchUsers
    }
  };

  // ---- Delete a user and all their playlists ----
  const handleDeleteUser = async (userId, username) => {
    // Prevent admin from deleting themselves
    if (userId === user?.id) {
      alert("You cannot delete your own admin account.");
      return;
    }

    if (!window.confirm(`Delete user "${username}" and all their playlists?`)) return;

    try {
      const res = await fetch(`http://localhost:5001/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      // Handle 403 — server rejected the request because user is not admin
      if (res.status === 403) {
        alert("403 Forbidden — the server blocked this action.");
        return;
      }

      if (res.ok) {
        // Remove deleted user from local state
        setUsers((prev) => prev.filter((u) => u._id !== userId));
        // Remove their playlists from local state too
        setPlaylists((prev) => prev.filter((p) => p.createdBy !== userId));
      }
    } catch {
      alert("Server unavailable");
    }
  };

  // ---- Delete any playlist ----
  const handleDeletePlaylist = async (playlistId, playlistName) => {
    if (!window.confirm(`Delete playlist "${playlistName}"?`)) return;

    try {
      const res = await fetch(`http://localhost:5001/api/admin/playlists/${playlistId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      // Handle 403 — server rejected because user is not admin
      if (res.status === 403) {
        alert("403 Forbidden — the server blocked this action.");
        return;
      }

      if (res.ok) {
        setPlaylists((prev) => prev.filter((p) => p._id !== playlistId));
      }
    } catch {
      alert("Server unavailable");
    }
  };

  // Find the username for a given user ID (for displaying playlist owner)
  const getUsernameById = (id) => {
    const found = users.find((u) => u._id === id);
    return found ? found.username : "Unknown";
  };

  return (
    <div className="app-shell">
      {/* ---- Header ---- */}
      <header className="header-row">
        <div>
          <h1 className="brand">Admin Dashboard</h1>
          <p className="welcome">
            Logged in as {user?.username} (admin)
          </p>
        </div>
      </header>

      {/* Show error if the server rejected access */}
      {error && (
        <div className="card">
          <p className="error-text">{error}</p>
        </div>
      )}

      {/* ---- All Users Section ---- */}
      <section className="card">
        <h3>All Users ({users.length})</h3>
        <div className="playlist-list">
          {users.map((u) => (
            <div key={u._id} className="playlist-item">
              <div className="playlist-title">
                {u.username}
                {/* Show a badge for admin users */}
                {u.role === "admin" && (
                  <span className="admin-badge">ADMIN</span>
                )}
              </div>
              <div className="playlist-meta">
                <span>Role: {u.role}</span>
                <span>ID: {u._id}</span>
              </div>
              {/* Only show delete button for non-admin users (can't delete yourself) */}
              {u._id !== user?.id && (
                <button
                  className="ghost-btn"
                  style={{ marginTop: "8px", color: "#b00020", borderColor: "#ecc" }}
                  onClick={() => handleDeleteUser(u._id, u.username)}
                >
                  Delete User
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ---- All Playlists Section ---- */}
      <section className="card">
        <h3>All Playlists ({playlists.length})</h3>
        <div className="playlist-list">
          {playlists.map((p) => (
            <div key={p._id} className="playlist-item">
              <div className="playlist-title">{p.name}</div>
              <div className="playlist-meta">
                <span>By: {getUsernameById(p.createdBy)}</span>
                {p.mood && <span>Mood: {p.mood}</span>}
                <span>{p.tracks?.length || 0} tracks</span>
              </div>
              <button
                className="ghost-btn"
                style={{ marginTop: "8px", color: "#b00020", borderColor: "#ecc" }}
                onClick={() => handleDeletePlaylist(p._id, p.name)}
              >
                Delete Playlist
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
