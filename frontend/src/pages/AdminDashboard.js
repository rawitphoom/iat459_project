import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

// Extract joined date from MongoDB ObjectId (first 4 bytes = timestamp)
function getJoinedDate(id) {
  if (!id || id.length < 8) return "Unknown";
  const timestamp = parseInt(id.substring(0, 8), 16) * 1000;
  const d = new Date(timestamp);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function AdminDashboard() {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("users"); // "users" | "mixtapes"
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

  useEffect(() => {
    if (user?.role !== "admin") {
      navigate("/home", { replace: true });
      return;
    }
    fetchUsers();
    fetchPlaylists();
  }, [user, token, navigate]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  const fetchPlaylists = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/admin/playlists", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) return;
      const data = await res.json();
      if (res.ok) setPlaylists(data);
    } catch {}
  };

  const handleDeleteUser = async (userId, username) => {
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
      if (res.status === 403) {
        alert("403 Forbidden — the server blocked this action.");
        return;
      }
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u._id !== userId));
        setPlaylists((prev) => prev.filter((p) => p.createdBy !== userId));
      }
    } catch {
      alert("Server unavailable");
    }
  };

  const handleDeletePlaylist = async (playlistId, playlistName) => {
    if (!window.confirm(`Delete mixtape "${playlistName}"?`)) return;
    try {
      const res = await fetch(`http://localhost:5001/api/admin/playlists/${playlistId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
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

  const getUsernameById = (id) => {
    const found = users.find((u) => u._id === id);
    return found ? found.username : "Unknown";
  };

  // Filter out current admin from user list for display
  const displayUsers = users.filter((u) => u._id !== user?.id);

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header">
        <h1 className="admin-title">
          WELCOME BACK {user?.username?.toUpperCase()}!
          <span className="admin-role-tag">[ADMIN]</span>
        </h1>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {/* Tab bar + view toggle */}
      <div className="admin-controls">
        <div className="admin-tabs">
          <button
            className={`admin-tab ${tab === "users" ? "active" : ""}`}
            onClick={() => setTab("users")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 6 }}>
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            ALL USERS ({users.length})
          </button>
          <button
            className={`admin-tab ${tab === "mixtapes" ? "active" : ""}`}
            onClick={() => setTab("mixtapes")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 6 }}>
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            ALL MIXTAPES ({playlists.length})
          </button>
        </div>
        <div className="admin-view-toggle">
          <button
            className={`admin-view-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
            title="Grid view"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>
            </svg>
          </button>
          <button
            className={`admin-view-btn ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
            title="List view"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="admin-divider" />

      {/* Users Tab */}
      {tab === "users" && viewMode === "grid" && (
        <div className="admin-grid">
          {displayUsers.map((u) => (
            <div key={u._id} className="admin-user-card">
              <div className="admin-user-avatar">
                <img
                  src={u.profileImage || `https://api.dicebear.com/7.x/big-smile/svg?seed=${u.username}`}
                  alt=""
                />
              </div>
              <div className="admin-user-avatar-label">PROFILE IMAGE</div>
              <div className="admin-user-detail">
                <span className="admin-user-field">NAME</span> {u.name || u.username}
              </div>
              <div className="admin-user-detail">
                <span className="admin-user-field">USERNAME</span> {u.username}
              </div>
              <div className="admin-user-detail">
                <span className="admin-user-field">JOINED</span> {getJoinedDate(u._id)}
              </div>
              <button
                className="admin-remove-btn"
                onClick={() => handleDeleteUser(u._id, u.username)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 6 }}>
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
                REMOVE USER
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "users" && viewMode === "list" && (
        <div className="admin-list">
          <div className="admin-list-header">
            <div className="admin-list-col admin-list-col-avatar" />
            <div className="admin-list-col admin-list-col-name">NAME</div>
            <div className="admin-list-col admin-list-col-username">USERNAME</div>
            <div className="admin-list-col admin-list-col-joined">JOINED</div>
            <div className="admin-list-col admin-list-col-action">REMOVE USER</div>
          </div>
          {displayUsers.map((u) => (
            <div key={u._id} className="admin-list-row">
              <div className="admin-list-col admin-list-col-avatar">
                <img
                  src={u.profileImage || `https://api.dicebear.com/7.x/big-smile/svg?seed=${u.username}`}
                  alt=""
                  className="admin-list-avatar"
                />
              </div>
              <div className="admin-list-col admin-list-col-name">{u.name || u.username}</div>
              <div className="admin-list-col admin-list-col-username">{u.username}</div>
              <div className="admin-list-col admin-list-col-joined">{getJoinedDate(u._id)}</div>
              <div className="admin-list-col admin-list-col-action">
                <button
                  className="admin-remove-icon"
                  onClick={() => handleDeleteUser(u._id, u.username)}
                  title="Remove user"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mixtapes Tab */}
      {tab === "mixtapes" && viewMode === "grid" && (
        <div className="admin-grid">
          {playlists.map((p) => (
            <div key={p._id} className="admin-mixtape-card">
              <div className="admin-mixtape-cover">
                {p.tracks && p.tracks.length > 0 ? (
                  <div className="admin-mixtape-mosaic">
                    {[0, 1, 2, 3].map((j) => {
                      const t = p.tracks[j % p.tracks.length];
                      return (
                        <img
                          key={j}
                          src={t?.albumArt || ""}
                          alt=""
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="admin-mixtape-empty">No Tracks</div>
                )}
              </div>
              <div className="admin-mixtape-info">
                <div className="admin-mixtape-name">{p.name}</div>
                <div className="admin-mixtape-tracks">{p.tracks?.length || 0} TRACKS</div>
              </div>
              <div className="admin-mixtape-creator">{getUsernameById(p.createdBy)}</div>
              <button
                className="admin-remove-btn"
                onClick={() => handleDeletePlaylist(p._id, p.name)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 6 }}>
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
                REMOVE MIXTAPE
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "mixtapes" && viewMode === "list" && (
        <div className="admin-list">
          <div className="admin-list-header">
            <div className="admin-list-col admin-list-col-avatar" />
            <div className="admin-list-col admin-list-col-name">NAME</div>
            <div className="admin-list-col admin-list-col-username">CREATOR</div>
            <div className="admin-list-col admin-list-col-joined">TRACKS</div>
            <div className="admin-list-col admin-list-col-action">REMOVE</div>
          </div>
          {playlists.map((p) => (
            <div key={p._id} className="admin-list-row">
              <div className="admin-list-col admin-list-col-avatar">
                <div className="admin-list-mixtape-thumb">
                  {p.tracks && p.tracks.length > 0 ? (
                    <img src={p.tracks[0]?.albumArt || ""} alt="" />
                  ) : (
                    <div className="admin-mixtape-empty-sm">-</div>
                  )}
                </div>
              </div>
              <div className="admin-list-col admin-list-col-name">{p.name}</div>
              <div className="admin-list-col admin-list-col-username">{getUsernameById(p.createdBy)}</div>
              <div className="admin-list-col admin-list-col-joined">{p.tracks?.length || 0}</div>
              <div className="admin-list-col admin-list-col-action">
                <button
                  className="admin-remove-icon"
                  onClick={() => handleDeletePlaylist(p._id, p.name)}
                  title="Remove mixtape"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
