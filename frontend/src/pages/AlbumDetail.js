import { useEffect, useState, useRef, useCallback, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import API_URL from "../config";

// =============================================
// Sign-In Popup — shown when a visitor (not logged in)
// tries to save an album, like a song, or write a review.
// Mimics the standalone Login page styling.
// =============================================
function SignInPopup({ onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
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
      onClose();
    } catch {
      setError("Server unavailable");
    }
  };

  return (
    <div className="ad-signin-overlay" onClick={onClose}>
      <div className="ad-signin-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ad-signin-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="ad-signin-logo">
          <img src="/logo.svg" alt="Mixtape" className="ad-signin-logo-img" />
          <div className="ad-signin-logo-text">
            <span className="ad-signin-logo-title">MIXTAPE</span>
            <span className="ad-signin-logo-sub">Your music collection</span>
          </div>
        </div>
        <h2 className="ad-signin-heading">SIGN IN</h2>
        <p className="ad-signin-subheading">welcome back,</p>

        {error && <div className="ad-signin-error">{error}</div>}

        <form className="ad-signin-form" onSubmit={handleSubmit}>
          <label className="ad-signin-label">EMAIL</label>
          <input
            className="ad-signin-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
          />
          <label className="ad-signin-label">PASSWORD</label>
          <input
            className="ad-signin-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />
          <div className="ad-signin-forgot">
            <Link to="/forgot-password" className="ad-signin-forgot-link" onClick={onClose}>Forgot password?</Link>
          </div>
          <button className="ad-signin-submit" type="submit">SIGN IN</button>
        </form>
        <p className="ad-signin-switch">
          Don't have an account?{" "}
          <Link to="/register" className="ad-signin-switch-link" onClick={onClose}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}

// =============================================
// Album Detail Page — split layout
// Left: full-height album cover + save button + rating
// Right: album info + track list with heart & play buttons
// Background: dynamic glow color extracted from album cover
// Route: /album/:id (Deezer album ID)
// =============================================

export default function AlbumDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dynamic background color extracted from the album cover image
  const [bgColor, setBgColor] = useState("40, 40, 40");

  // Audio preview state
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  // Liked tracks
  const [likedTracks, setLikedTracks] = useState([]);

  // Album saved state
  const [saved, setSaved] = useState(false);

  // More albums by the same artist
  const [moreAlbums, setMoreAlbums] = useState([]);

  // Heart popup modal state
  const [heartPopup, setHeartPopup] = useState(null); // track object or null
  const [heartPos, setHeartPos] = useState({ x: 0, y: 0 }); // popup position
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [playlistTrackMap, setPlaylistTrackMap] = useState({}); // { playlistId: [trackIds] }


  // Reviews
  const { user, token } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState({ avg: 0, count: 0 });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ title: "", rating: 5, text: "" });
  const [reviewError, setReviewError] = useState("");
  const [visibleReviews, setVisibleReviews] = useState(6);

  // ---- Extract dominant color from album cover ----
  // Draws the image onto a hidden canvas, samples pixels, and averages them.
  // This creates a background glow that matches the album artwork.
  const extractColor = useCallback((imgUrl) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Required for Deezer CDN images
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 50;
      canvas.height = 50;
      ctx.drawImage(img, 0, 0, 50, 50);

      const data = ctx.getImageData(0, 0, 50, 50).data;
      let r = 0, g = 0, b = 0, count = 0;

      // Average pixel colors, skipping very dark/light pixels
      // so we get a rich, saturated color
      for (let i = 0; i < data.length; i += 4) {
        const pr = data[i], pg = data[i + 1], pb = data[i + 2];
        const brightness = (pr + pg + pb) / 3;
        if (brightness > 30 && brightness < 220) {
          r += pr;
          g += pg;
          b += pb;
          count++;
        }
      }

      if (count > 0) {
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        setBgColor(`${r}, ${g}, ${b}`);
      }
    };
    img.src = imgUrl;
  }, []);

  // ---- Stop audio when user navigates away ----
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // ---- Fetch album detail from backend ----
  useEffect(() => {
    fetch(`${API_URL}/api/music/album/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Album not found");
        return res.json();
      })
      .then((data) => {
        setAlbum(data);
        if (data.coverXl || data.cover) {
          extractColor(data.coverXl || data.cover);
        }
        // Fetch reviews + average rating
        fetch(`${API_URL}/api/reviews/album/${id}`)
          .then((r) => r.json())
          .then((revs) => setReviews(Array.isArray(revs) ? revs : []))
          .catch(() => {});
        fetch(`${API_URL}/api/reviews/album/${id}/rating`)
          .then((r) => r.json())
          .then((r) => setAvgRating(r))
          .catch(() => {});

        // Fetch more albums by the same artist
        if (data.artistId) {
          fetch(`${API_URL}/api/music/artist/${data.artistId}/albums`)
            .then((r) => r.json())
            .then((albums) => {
              setMoreAlbums(
                Array.isArray(albums)
                  ? albums.filter((a) => String(a.id) !== String(id))
                  : []
              );
            })
            .catch(() => {});
        }

        // Check if album is favorited + load liked songs
        if (token) {
          fetch(`${API_URL}/api/favorites/albums/check/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => r.json())
            .then((r) => setSaved(r.isFavorited))
            .catch(() => {});

          fetch(`${API_URL}/api/favorites/songs`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => r.json())
            .then((favs) => {
              if (Array.isArray(favs)) {
                setLikedTracks(favs.map((f) => f.trackId));
              }
            })
            .catch(() => {});
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, extractColor, token]);

  // ---- Audio preview toggle ----
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

  // ---- Open heart popup for a track ----
  const openHeartPopup = async (e, track) => {
    if (!token) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHeartPos({ x: rect.left, y: rect.top });
    setHeartPopup(track);

    // Fetch user's playlists
    try {
      const res = await fetch(`${API_URL}/api/playlists`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setUserPlaylists(data);
        // Build map of which playlists contain this track
        const map = {};
        data.forEach((pl) => {
          map[pl._id] = pl.tracks?.map((t) => t.trackId) || [];
        });
        setPlaylistTrackMap(map);
      }
    } catch {}
  };

  // ---- Toggle liked songs (favorites) from popup ----
  const toggleLikedSongs = async () => {
    if (!heartPopup || !token) return;
    const track = heartPopup;
    const isLiked = likedTracks.includes(track.trackId);

    setLikedTracks((prev) =>
      isLiked ? prev.filter((id) => id !== track.trackId) : [...prev, track.trackId]
    );

    try {
      if (isLiked) {
        await fetch(`${API_URL}/api/favorites/songs/${track.trackId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch(`${API_URL}/api/favorites/songs`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            trackId: track.trackId,
            name: track.name,
            artist: track.artist,
            album: album?.title || "",
            albumArt: album?.cover || "",
            previewUrl: track.previewUrl,
            durationSec: track.durationSec,
          }),
        });
      }
    } catch {
      setLikedTracks((prev) =>
        isLiked ? [...prev, track.trackId] : prev.filter((id) => id !== track.trackId)
      );
    }
  };

  // ---- Toggle track in a playlist from popup ----
  const toggleTrackInPlaylist = async (playlistId) => {
    if (!heartPopup || !token) return;
    const track = heartPopup;
    const trackIds = playlistTrackMap[playlistId] || [];
    const isInPlaylist = trackIds.includes(track.trackId);

    // Optimistic update
    setPlaylistTrackMap((prev) => ({
      ...prev,
      [playlistId]: isInPlaylist
        ? trackIds.filter((id) => id !== track.trackId)
        : [...trackIds, track.trackId],
    }));

    try {
      if (isInPlaylist) {
        await fetch(`${API_URL}/api/playlists/${playlistId}/tracks/${track.trackId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch(`${API_URL}/api/playlists/${playlistId}/tracks`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            trackId: track.trackId,
            name: track.name,
            artist: track.artist,
            album: album?.title || "",
            albumArt: album?.cover || "",
            previewUrl: track.previewUrl,
            durationSec: track.durationSec,
          }),
        });
      }
    } catch {
      // Revert
      setPlaylistTrackMap((prev) => ({
        ...prev,
        [playlistId]: isInPlaylist
          ? [...trackIds]
          : trackIds.filter((id) => id !== track.trackId),
      }));
    }
  };

  // ---- Toggle save album (saves to MongoDB) ----
  const toggleSaveAlbum = async () => {
    if (!token) return;

    const wasSaved = saved;
    setSaved(!wasSaved); // Optimistic

    try {
      if (wasSaved) {
        await fetch(`${API_URL}/api/favorites/albums/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch(`${API_URL}/api/favorites/albums`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            albumId: String(id),
            title: album?.title || "",
            artist: album?.artist || "",
            cover: album?.coverXl || album?.cover || "",
          }),
        });
      }
    } catch {
      setSaved(wasSaved); // Revert on error
    }
  };

  // ---- Format seconds to "mm:ss" ----
  const formatDuration = (sec) => {
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Format total album duration
  const formatTotalDuration = (sec) => {
    const min = Math.round(sec / 60);
    return `${min} min`;
  };

  // Extract year from "2015-03-15" → "2015"
  const getYear = (date) => date?.split("-")[0] || "";

  // Format date for reviews: "24 Sep 2024"
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  // Render star icons
  const renderStars = (rating) => "★".repeat(rating) + "☆".repeat(5 - rating);

  // Submit a new review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewError("");
    if (!token) { setReviewError("You must be logged in to write a review."); return; }
    if (!reviewForm.rating) { setReviewError("Rating is required."); return; }

    try {
      const res = await fetch(`${API_URL}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          albumId: String(id),
          albumTitle: album?.title || "",
          albumArt: album?.coverXl || album?.cover || "",
          title: reviewForm.title,
          rating: reviewForm.rating,
          text: reviewForm.text,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setReviewError(data?.error || "Failed to submit"); return; }

      setReviews((prev) => [data, ...prev]);
      setReviewForm({ title: "", rating: 5, text: "" });
      setShowReviewForm(false);
      // Refresh average
      fetch(`${API_URL}/api/reviews/album/${id}/rating`)
        .then((r) => r.json())
        .then((r) => setAvgRating(r))
        .catch(() => {});
    } catch {
      setReviewError("Server unavailable");
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Delete this review?")) return;
    try {
      const res = await fetch(`${API_URL}/api/reviews/${reviewId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r._id !== reviewId));
        // Refresh average
        fetch(`${API_URL}/api/reviews/album/${id}/rating`)
          .then((r) => r.json())
          .then((r) => setAvgRating(r))
          .catch(() => {});
      }
    } catch {}
  };

  // Sign-in popup state for visitors trying to save an album
  const [showSignInPopup, setShowSignInPopup] = useState(false);

  if (loading) {
    return (
      <div className="ad-wrapper ad-slide-in">
        <p className="discover-loading">Loading album...</p>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="ad-wrapper ad-slide-in">
        <p className="discover-empty">{error || "Album not found"}</p>
        <button className="discover-clear-btn" onClick={() => navigate("/discover")}>
          Back to Discover
        </button>
      </div>
    );
  }

  const handleSaveClick = () => {
    if (!token) {
      setShowSignInPopup(true);
      return;
    }
    toggleSaveAlbum();
  };

  return (
    <div className="ad-wrapper ad-slide-in">
      {/* ---- Dynamic glow background ---- */}
      <div
        className="ad-glow"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, rgb(${bgColor}) 0%, rgba(${bgColor}, 0.6) 30%, rgba(${bgColor}, 0.2) 60%, transparent 100%)`,
        }}
      />

      {/* ---- Back button (top-left) ---- */}
      <button className="ad-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>

      {/* ======== SPLIT SECTION: Cover + Tracks ======== */}
      <div className="ad-page">
        {/* ---- LEFT: Album cover + title + actions ---- */}
        <div className="ad-left">
          <img
            className="ad-cover"
            src={album.coverXl || album.cover}
            alt={album.title}
          />
          <div className="ad-left-info">
            <div className="ad-title-row">
              <h1 className="ad-title">{album.title}</h1>
              {getYear(album.releaseDate) && (
                <span className="ad-year">{getYear(album.releaseDate)}</span>
              )}
            </div>
            <div className="ad-artist-line">{album.artist}</div>

            <button
              className={`ad-save-btn ${saved ? "saved" : ""}`}
              onClick={handleSaveClick}
            >
              {saved ? "SAVED" : "SAVE  ALBUM"}
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d={saved ? "M6.979 3.074a6 6 0 0 1 4.988 1.425l.037.033l.034-.03a6 6 0 0 1 4.733-1.44l.246.036a6 6 0 0 1 3.364 10.008l-.18.185l-.048.041l-7.45 7.379a1 1 0 0 1-1.313.082l-.094-.082l-7.493-7.422A6 6 0 0 1 6.979 3.074" : "M12 4.46a6 6 0 0 0-4.021-1.386l-.255.009A6 6 0 0 0 3.828 13.18l7.449 7.382a1 1 0 0 0 1.407 0l7.449-7.382a6 6 0 0 0-3.895-10.112l-.254-.009A6 6 0 0 0 12 4.461m0 2.081l.894-.886a4 4 0 0 1 5.793.147l.14.158a4 4 0 0 1-.152 5.498L12 18.074l-6.675-6.616a4 4 0 0 1 .012-5.656l.14-.148a4 4 0 0 1 5.63-.006z"} /></svg>
            </button>

            {/* Average rating stars (5-star display) */}
            <div className="ad-rating-stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={`ad-rating-star ${n <= Math.round(avgRating.avg || 0) ? "filled" : ""}`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ---- RIGHT: Track list (no separators) ---- */}
        <div className="ad-right">
          <div className="ad-summary">
            {album.totalTracks || album.tracks?.length || 0} TRACKS
            <span className="ad-summary-dot">•</span>
            {formatTotalDuration(album.duration || 0)}
          </div>
          <div className="ad-tracks">
            {album.tracks?.map((track, i) => (
              <div
                key={track.trackId || i}
                className={`ad-track ${playingId === track.trackId ? "playing" : ""}`}
              >
                <span className="ad-track-num">{String(i + 1).padStart(2, "0")}</span>
                <div className="ad-track-info">
                  <div className="ad-track-name">{track.name}</div>
                  <div className="ad-track-artist">{track.artist}</div>
                </div>
                <span className="ad-track-dur">
                  {track.durationSec ? formatDuration(track.durationSec) : ""}
                </span>
                <button
                  className={`ad-track-heart ${likedTracks.includes(track.trackId) ? "liked" : ""}`}
                  onClick={(e) => token ? openHeartPopup(e, track) : setShowSignInPopup(true)}
                  title="Add to..."
                >
                  {likedTracks.includes(track.trackId) ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M6.979 3.074a6 6 0 0 1 4.988 1.425l.037.033l.034-.03a6 6 0 0 1 4.733-1.44l.246.036a6 6 0 0 1 3.364 10.008l-.18.185l-.048.041l-7.45 7.379a1 1 0 0 1-1.313.082l-.094-.082l-7.493-7.422A6 6 0 0 1 6.979 3.074"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.5 12.572L12 20l-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572"/></svg>
                  )}
                </button>
                <button
                  className={`ad-track-play ${playingId === track.trackId ? "active" : ""}`}
                  onClick={() => togglePreview(track)}
                  title={playingId === track.trackId ? "Pause" : "Play preview"}
                >
                  {playingId === track.trackId ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ======== MORE BY ARTIST ======== */}
      {moreAlbums.length > 0 && (
        <div className="ad-more">
          <h2 className="ad-more-title">MORE BY {album.artist?.toUpperCase()}</h2>
          <div className="ad-more-grid">
              {moreAlbums.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="ad-more-card"
                  onClick={() => navigate(`/album/${a.id}`)}
                >
                  <img
                    className="ad-more-img"
                    src={a.cover}
                    alt={a.title}
                  />
                  <div className="ad-more-name">{a.title?.toUpperCase()}</div>
                  <div className="ad-more-year">{a.artist || ""}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ======== REVIEWS SECTION ======== */}
      <div className="ad-reviews-section">
        <div className="ad-reviews-header">
          <h2 className="ad-reviews-title">REVIEWS ({reviews.length})</h2>
          <button
            className="ad-write-review-btn"
            onClick={() => token ? setShowReviewForm(!showReviewForm) : setShowSignInPopup(true)}
          >
            <svg width="28" height="28" viewBox="0 0 43 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="41" height="40" rx="20" stroke="#F36A40" strokeWidth="2"/>
              <path d="M23.3877 18.3486L23.6162 18.915L24.2246 18.9707L29.1484 19.4189L25.3711 22.8633L24.9424 23.2529L25.0684 23.8184L26.1875 28.8623L22.0361 26.2285L21.501 25.8887L20.9648 26.2285L16.8125 28.8643L17.9316 23.8203L18.0576 23.2549L17.6289 22.8643L13.8506 19.4199L18.7773 18.9717L19.3848 18.917L19.6133 18.3506L21.5 13.6719L23.3877 18.3486Z" stroke="#F36A40" strokeWidth="2"/>
            </svg>
            ADD A REVIEW
          </button>
        </div>

        {/* Write review form */}
        {showReviewForm && (
          <form className="ad-review-form" onSubmit={handleSubmitReview}>
            <input
              className="ad-review-input"
              placeholder="Review title"
              value={reviewForm.title}
              onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
            />
            <div className="ad-review-rating-select">
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={`ad-review-star-pick ${n <= reviewForm.rating ? "active" : ""}`}
                  onClick={() => setReviewForm({ ...reviewForm, rating: n })}
                >
                  ★
                </span>
              ))}
            </div>
            <textarea
              className="ad-review-textarea"
              placeholder="Write your review..."
              rows={4}
              value={reviewForm.text}
              onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
            />
            {reviewError && <p className="ad-review-error">{reviewError}</p>}
            <div className="ad-review-form-actions">
              <button className="ad-review-submit" type="submit">Submit</button>
              <button
                className="ad-review-cancel"
                type="button"
                onClick={() => setShowReviewForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Review cards — vinyl + cover layout */}
        <div className="ad-reviews-list">
          {reviews.slice(0, visibleReviews).map((review) => (
            <div key={review._id} className="ad-review-card">
              <div className="ad-review-body">
                <div className="ad-review-date">Posted {formatDate(review.createdAt)}</div>
                <div className="ad-review-card-title">{review.title || album.title}</div>
                <div className="ad-review-card-artist">{album.artist}</div>
                <div className="ad-review-userline">
                  <div className="ad-review-avatar">
                    {review.username?.charAt(0).toUpperCase()}
                  </div>
                  <span className="ad-review-username">{review.username}</span>
                </div>
                <div className="ad-review-stars">{renderStars(review.rating)}</div>
                {review.title && review.text && (
                  <div className="ad-review-headline">{review.title}</div>
                )}
                <p className="ad-review-text">{review.text}</p>
                {(user?.role === "admin" || user?.id === review.userId) && (
                  <button
                    className="ad-review-delete"
                    onClick={() => handleDeleteReview(review._id)}
                    title="Delete review"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                )}
              </div>
              <div className="ad-review-right">
                <div className="ad-review-cover">
                  <img
                    src={process.env.PUBLIC_URL + "/review-vinyl.svg"}
                    alt=""
                    className="ad-review-vinyl"
                  />
                  <img
                    src={album.coverXl || album.cover}
                    alt={album.title}
                    className="ad-review-art"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {reviews.length === 0 && (
          <p className="ad-reviews-empty">No reviews yet. Be the first to write one!</p>
        )}

        {visibleReviews < reviews.length && (
          <button
            className="ad-reviews-load-more"
            onClick={() => setVisibleReviews((prev) => prev + 6)}
          >
            Load more...
          </button>
        )}
      </div>

      {/* ======== SIGN-IN POPUP (for visitors) ======== */}
      {showSignInPopup && (
        <SignInPopup onClose={() => setShowSignInPopup(false)} />
      )}

      {/* ======== HEART POPUP MODAL ======== */}
      {heartPopup && (
        <div className="heart-popup-overlay" onClick={() => setHeartPopup(null)}>
          <div
            className="heart-popup"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              left: `${Math.min(heartPos.x - 320, window.innerWidth - 360)}px`,
              top: `${Math.max(Math.min(heartPos.y - 60, window.innerHeight - 400), 20)}px`,
            }}
          >
            <div className="heart-popup-header">
              <div className="heart-popup-track">
                <strong>{heartPopup.name}</strong>
                <span>{heartPopup.artist}</span>
              </div>
              <button className="heart-popup-close" onClick={() => setHeartPopup(null)}>✕</button>
            </div>

            <div className="heart-popup-list">
              {/* Liked Songs toggle */}
              <button
                className={`heart-popup-item ${likedTracks.includes(heartPopup.trackId) ? "active" : ""}`}
                onClick={toggleLikedSongs}
              >
                <span className="heart-popup-icon">♥</span>
                <span className="heart-popup-name">Liked Songs</span>
                <span className={`heart-popup-check ${likedTracks.includes(heartPopup.trackId) ? "checked" : ""}`}>
                  {likedTracks.includes(heartPopup.trackId) ? "✓" : ""}
                </span>
              </button>

              {/* User's playlists */}
              {userPlaylists.map((pl) => {
                const isIn = (playlistTrackMap[pl._id] || []).includes(heartPopup.trackId);
                return (
                  <button
                    key={pl._id}
                    className={`heart-popup-item ${isIn ? "active" : ""}`}
                    onClick={() => toggleTrackInPlaylist(pl._id)}
                  >
                    <span className="heart-popup-icon">
                      {pl.tracks?.length > 0 && pl.tracks[0].albumArt ? (
                        <img src={pl.tracks[0].albumArt} alt="" className="heart-popup-playlist-art" />
                      ) : "♪"}
                    </span>
                    <span className="heart-popup-name">{pl.name}</span>
                    <span className={`heart-popup-check ${isIn ? "checked" : ""}`}>
                      {isIn ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>

            <button className="heart-popup-cancel" onClick={() => setHeartPopup(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
