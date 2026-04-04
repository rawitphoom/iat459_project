import { useEffect, useState, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

// =============================================
// Profile Page — view your own or another user's profile
// Shows: avatar, username, stats, mixtapes, and reviews
// Route: /profile (own) or /profile/:id (other user)
// =============================================

export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);

  // If no :id param, use the logged-in user's ID
  const profileId = id || user?.id;
  const isOwn = !id || id === user?.id;

  const [profile, setProfile] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("mixtapes");

  // Audio preview
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Fetch profile data
  useEffect(() => {
    if (!profileId) return;

    setLoading(true);

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.all([
      fetch(`http://localhost:5001/api/profile/${profileId}`).then((r) => r.json()),
      fetch(`http://localhost:5001/api/profile/${profileId}/playlists`, { headers }).then((r) => r.json()),
      fetch(`http://localhost:5001/api/profile/${profileId}/reviews`).then((r) => r.json()),
    ])
      .then(([profileData, playlistData, reviewData]) => {
        setProfile(profileData);
        setPlaylists(Array.isArray(playlistData) ? playlistData : []);
        setReviews(Array.isArray(reviewData) ? reviewData : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profileId, token]);

  // Audio preview toggle
  const togglePreview = (track) => {
    if (!track.previewUrl) return;
    if (playingId === track.trackId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(track.previewUrl);
    audio.volume = 0.5;
    audio.play();
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(track.trackId);
  };

  const formatDuration = (sec) => {
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return `${min}:${String(s).padStart(2, "0")}`;
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const renderStars = (rating) => "★".repeat(rating) + "☆".repeat(5 - rating);

  if (!profileId) {
    return (
      <div className="profile-page">
        <div className="profile-empty">
          <p>Please sign in to view your profile.</p>
          <button className="profile-cta" onClick={() => navigate("/login")}>
            SIGN IN
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="profile-page">
        <p className="profile-loading">Loading profile...</p>
      </div>
    );
  }

  if (!profile || profile.error) {
    return (
      <div className="profile-page">
        <p className="profile-empty">User not found.</p>
        <button className="profile-cta" onClick={() => navigate("/home")}>
          GO HOME
        </button>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* ======== HEADER ======== */}
      <div className="profile-header">
        <div className="profile-avatar">
          {profile.username?.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <h1 className="profile-username">{profile.username}</h1>
          <div className="profile-stats">
            <div className="profile-stat">
              <span className="profile-stat-num">{profile.stats?.playlists || 0}</span>
              <span className="profile-stat-label">Mixtapes</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-num">{profile.stats?.reviews || 0}</span>
              <span className="profile-stat-label">Reviews</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-num">{profile.stats?.avgRating || "—"}</span>
              <span className="profile-stat-label">Avg Rating</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======== TABS ======== */}
      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === "mixtapes" ? "active" : ""}`}
          onClick={() => setActiveTab("mixtapes")}
        >
          MIXTAPES ({playlists.length})
        </button>
        <button
          className={`profile-tab ${activeTab === "reviews" ? "active" : ""}`}
          onClick={() => setActiveTab("reviews")}
        >
          REVIEWS ({reviews.length})
        </button>
      </div>

      {/* ======== MIXTAPES TAB ======== */}
      {activeTab === "mixtapes" && (
        <div className="profile-content">
          {playlists.length === 0 ? (
            <p className="profile-empty-tab">
              {isOwn
                ? "You haven't created any mixtapes yet."
                : "This user hasn't shared any mixtapes yet."}
            </p>
          ) : (
            <div className="profile-mixtapes-grid">
              {playlists.map((pl) => (
                <div key={pl._id} className="profile-mixtape-card">
                  <div className="profile-mixtape-cover">
                    {pl.tracks?.slice(0, 4).map((t, j) => (
                      <img key={j} src={t.albumArt} alt="" className="profile-mixtape-thumb" />
                    ))}
                    {(!pl.tracks || pl.tracks.length === 0) && (
                      <div className="profile-mixtape-empty-cover">♪</div>
                    )}
                  </div>
                  <div className="profile-mixtape-info">
                    <div className="profile-mixtape-name">{pl.name}</div>
                    <div className="profile-mixtape-meta">
                      {pl.tracks?.length || 0} tracks
                      {pl.mood ? ` · ${pl.mood}` : ""}
                      {pl.public ? "" : " · Private"}
                    </div>
                    {pl.description && (
                      <div className="profile-mixtape-desc">{pl.description}</div>
                    )}
                  </div>

                  {/* Track list */}
                  {pl.tracks?.length > 0 && (
                    <div className="profile-mixtape-tracks">
                      {pl.tracks.map((track, i) => (
                        <div
                          key={track.trackId || i}
                          className={`profile-track ${playingId === track.trackId ? "playing" : ""}`}
                        >
                          <img className="profile-track-art" src={track.albumArt} alt={track.album} />
                          <div className="profile-track-info">
                            <div className="profile-track-name">{track.name}</div>
                            <div className="profile-track-artist">
                              {track.artist}
                              {track.durationSec ? ` · ${formatDuration(track.durationSec)}` : ""}
                            </div>
                          </div>
                          {track.previewUrl && (
                            <button
                              className={`profile-track-play ${playingId === track.trackId ? "active" : ""}`}
                              onClick={() => togglePreview(track)}
                            >
                              {playingId === track.trackId ? "❚❚" : "▶"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {isOwn && (
            <button className="profile-cta" onClick={() => navigate("/dashboard")}>
              + CREATE NEW MIXTAPE
            </button>
          )}
        </div>
      )}

      {/* ======== REVIEWS TAB ======== */}
      {activeTab === "reviews" && (
        <div className="profile-content">
          {reviews.length === 0 ? (
            <p className="profile-empty-tab">
              {isOwn
                ? "You haven't written any reviews yet."
                : "This user hasn't written any reviews yet."}
            </p>
          ) : (
            <div className="profile-reviews-grid">
              {reviews.map((review) => (
                <div
                  key={review._id}
                  className="profile-review-card"
                  onClick={() => review.albumId && navigate(`/album/${review.albumId}`)}
                >
                  <div className="profile-review-album">{review.albumTitle || "Unknown Album"}</div>
                  {review.title && (
                    <div className="profile-review-title">{review.title}</div>
                  )}
                  <div className="profile-review-stars">{renderStars(review.rating)}</div>
                  <p className="profile-review-text">{review.text}</p>
                  <div className="profile-review-footer">
                    <span>{formatDate(review.createdAt)}</span>
                    <span>♥ {review.likes || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
