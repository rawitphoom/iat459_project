import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import API_URL from "../config";
import ConfirmModal from "../components/ConfirmModal";

/*
 * AdminDashboard — moderation / maintenance screen for admins only.
 * Route: /admin
 *
 * The page lets an admin inspect users and public mixtapes, switch between
 * grid/list views, and remove problematic content or accounts when needed.
 * Real authorization still lives on the backend; the redirect here is only
 * the first layer of protection for the UI.
 */

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
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("users"); // "users" | "mixtapes" | "reviews"

  // Centralized confirm-modal state. Set `confirm` to { title, message, onConfirm }
  // to show the modal; clear it to dismiss.
  const [confirm, setConfirm] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

  useEffect(() => {
    if (user?.role !== "admin") {
      navigate("/home", { replace: true });
      return;
    }
    fetchUsers();
    fetchPlaylists();
    fetchReviews();
  }, [user, token, navigate]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
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
      const res = await fetch(`${API_URL}/api/admin/playlists`, {
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
    setConfirm({
      title: "Delete user?",
      message: `Delete "${username}" and all their playlists? This cannot be undone.`,
      confirmText: "DELETE",
      onConfirm: async () => {
        setConfirm(null);
        try {
          const res = await fetch(`${API_URL}/api/admin/users/${userId}`, {
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
      },
    });
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/reviews`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) return;
      const data = await res.json();
      if (res.ok) setReviews(data);
    } catch {}
  };

  const handleDeleteReview = (reviewId, albumTitle) => {
    setConfirm({
      title: "Remove review?",
      message: `Remove this review for "${albumTitle || "this album"}"?`,
      confirmText: "REMOVE",
      onConfirm: async () => {
        setConfirm(null);
        try {
          const res = await fetch(`${API_URL}/api/reviews/${reviewId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.status === 403) {
            alert("403 Forbidden — the server blocked this action.");
            return;
          }
          if (res.ok) {
            setReviews((prev) => prev.filter((r) => r._id !== reviewId));
          }
        } catch {
          alert("Server unavailable");
        }
      },
    });
  };

  // Format a review's date similar to user JOINED format
  const formatReviewDate = (createdAt) => {
    if (!createdAt) return "Unknown";
    const d = new Date(createdAt);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const handleDeletePlaylist = (playlistId, playlistName) => {
    setConfirm({
      title: "Delete mixtape?",
      message: `Delete mixtape "${playlistName}"? This cannot be undone.`,
      confirmText: "DELETE",
      onConfirm: async () => {
        setConfirm(null);
        try {
          const res = await fetch(`${API_URL}/api/admin/playlists/${playlistId}`, {
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
      },
    });
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
          <button
            className={`admin-tab ${tab === "reviews" ? "active" : ""}`}
            onClick={() => setTab("reviews")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 6 }}>
              <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/>
            </svg>
            ALL REVIEWS ({reviews.length})
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
              <div className={`admin-mixtape-cover ${p.image ? "has-custom-cover" : ""}`}>
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    className="admin-mixtape-cover-image"
                  />
                ) : p.tracks && p.tracks.length > 0 ? (
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

      {/* Reviews Tab — grid */}
      {tab === "reviews" && viewMode === "grid" && (
        <div className="admin-grid">
          {reviews.map((r) => (
            <div
              key={r._id}
              className="admin-review-card admin-review-card-clickable"
              onClick={() => r.albumId && navigate(`/album/${r.albumId}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && r.albumId) {
                  e.preventDefault();
                  navigate(`/album/${r.albumId}`);
                }
              }}
            >
              <div className="admin-review-header">
                <div className="admin-review-album-art">
                  {r.albumArt ? (
                    <img src={r.albumArt} alt={r.albumTitle} />
                  ) : (
                    <div className="admin-mixtape-empty-sm">-</div>
                  )}
                </div>
                <div className="admin-review-album-info">
                  <div className="admin-review-album-title">{r.albumTitle || "Unknown album"}</div>
                  <div className="admin-review-meta">
                    BY {r.username?.toUpperCase()} · {formatReviewDate(r.createdAt)}
                  </div>
                </div>
              </div>
              <div className="admin-review-rating">
                {"\u2605".repeat(r.rating || 0)}
                {"\u2606".repeat(5 - (r.rating || 0))}
              </div>
              {r.title && <div className="admin-review-title">{r.title}</div>}
              {r.text && <div className="admin-review-text">{r.text}</div>}
              <button
                className="admin-remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteReview(r._id, r.albumTitle);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 6 }}>
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
                REMOVE REVIEW
              </button>
            </div>
          ))}
          {reviews.length === 0 && <div className="admin-review-empty">No reviews yet.</div>}
        </div>
      )}

      {/* Reviews Tab — list */}
      {tab === "reviews" && viewMode === "list" && (
        <div className="admin-list">
          <div className="admin-list-header">
            <div className="admin-list-col admin-list-col-avatar" />
            <div className="admin-list-col admin-list-col-name">ALBUM</div>
            <div className="admin-list-col admin-list-col-username">USER</div>
            <div className="admin-list-col admin-list-col-joined">RATING</div>
            <div className="admin-list-col admin-list-col-action">REMOVE</div>
          </div>
          {reviews.map((r) => (
            <div
              key={r._id}
              className="admin-list-row admin-review-card-clickable"
              onClick={() => r.albumId && navigate(`/album/${r.albumId}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && r.albumId) {
                  e.preventDefault();
                  navigate(`/album/${r.albumId}`);
                }
              }}
            >
              <div className="admin-list-col admin-list-col-avatar">
                <div className="admin-list-mixtape-thumb">
                  {r.albumArt ? (
                    <img src={r.albumArt} alt={r.albumTitle} />
                  ) : (
                    <div className="admin-mixtape-empty-sm">-</div>
                  )}
                </div>
              </div>
              <div className="admin-list-col admin-list-col-name">{r.albumTitle || "Unknown album"}</div>
              <div className="admin-list-col admin-list-col-username">{r.username}</div>
              <div className="admin-list-col admin-list-col-joined">{r.rating || 0}/5</div>
              <div className="admin-list-col admin-list-col-action">
                <button
                  className="admin-remove-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteReview(r._id, r.albumTitle);
                  }}
                  title="Remove review"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
          {reviews.length === 0 && <div className="admin-review-empty">No reviews yet.</div>}
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
                  {p.image ? (
                    <img src={p.image} alt={p.name} />
                  ) : p.tracks && p.tracks.length > 0 ? (
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

      {/* Shared confirmation modal for delete actions */}
      <ConfirmModal
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmText={confirm?.confirmText || "CONFIRM"}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
