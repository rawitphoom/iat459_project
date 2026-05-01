import { useEffect, useState, useRef, useCallback, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API_URL from "../config";
import { AuthContext } from "../context/AuthContext";
import { SignInPopup } from "./AlbumDetail";
import ConfirmModal from "../components/ConfirmModal";

/*
 * PlaylistDetail — public/private mixtape detail page.
 * Route: /playlist/:id
 *
 * This page reuses the album-detail visual language for user-made mixtapes:
 * dynamic background glow, large cover art, creator info, metadata, and a
 * playable track list with 30-second previews.
 */
export default function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bgColor, setBgColor] = useState("40, 40, 40");
  const [playingId, setPlayingId] = useState(null);
  const [likedTracks, setLikedTracks] = useState([]);
  const audioRef = useRef(null);

  // Reviews
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState({ avg: 0, count: 0 });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ title: "", rating: 5, text: "" });
  const [reviewError, setReviewError] = useState("");
  const [visibleReviews, setVisibleReviews] = useState(6);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showSignInPopup, setShowSignInPopup] = useState(false);

  // Extract dominant color from cover image
  const extractColor = useCallback((imgUrl) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 50;
      canvas.height = 50;
      ctx.drawImage(img, 0, 0, 50, 50);
      const data = ctx.getImageData(0, 0, 50, 50).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const pr = data[i], pg = data[i + 1], pb = data[i + 2];
        const brightness = (pr + pg + pb) / 3;
        if (brightness > 30 && brightness < 220) {
          r += pr; g += pg; b += pb; count++;
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

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Fetch playlist
  useEffect(() => {
    fetch(`${API_URL}/api/playlists/detail/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Playlist not found");
        return res.json();
      })
      .then((data) => {
        setPlaylist(data);
        const coverImg = data.image || data.tracks?.[0]?.albumArt;
        if (coverImg) extractColor(coverImg);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, extractColor]);

  // Fetch reviews + average rating for this mixtape
  useEffect(() => {
    fetch(`${API_URL}/api/reviews/playlist/${id}`)
      .then((r) => r.json())
      .then((revs) => setReviews(Array.isArray(revs) ? revs : []))
      .catch(() => {});
    fetch(`${API_URL}/api/reviews/playlist/${id}/rating`)
      .then((r) => r.json())
      .then((r) => setAvgRating(r))
      .catch(() => {});
  }, [id]);

  // Load user's liked tracks
  useEffect(() => {
    if (!token) { setLikedTracks([]); return; }
    fetch(`${API_URL}/api/favorites/songs`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((favs) => {
        if (Array.isArray(favs)) setLikedTracks(favs.map((f) => f.trackId));
      })
      .catch(() => {});
  }, [token]);

  const toggleLike = async (track) => {
    if (!token) return;
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
            album: track.album || "",
            albumArt: track.albumArt || "",
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

  // One preview at a time. Saved Deezer preview URLs can expire, so on failure
  // we refetch a fresh URL by track ID and retry once.
  const playWithUrl = (trackId, url) => {
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(url);
    audio.volume = 0.5;
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(trackId);
    return audio.play();
  };

  const togglePreview = async (track) => {
    if (playingId === track.trackId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    try {
      if (track.previewUrl) {
        await playWithUrl(track.trackId, track.previewUrl);
        return;
      }
      throw new Error("no url");
    } catch {
      try {
        const r = await fetch(`${API_URL}/api/music/track/${track.trackId}/preview`);
        const { previewUrl } = await r.json();
        if (!previewUrl) throw new Error("no preview");
        setPlaylist((p) => p ? { ...p, tracks: p.tracks.map((t) => t.trackId === track.trackId ? { ...t, previewUrl } : t) } : p);
        await playWithUrl(track.trackId, previewUrl);
      } catch {
        setPlayingId(null);
      }
    }
  };

  const formatDuration = (sec) => {
    if (!sec) return "";
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const totalDuration = () => {
    if (!playlist?.tracks) return 0;
    const total = playlist.tracks.reduce((sum, t) => sum + (t.durationSec || 0), 0);
    return Math.round(total / 60);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const renderStars = (rating) => "★".repeat(rating) + "☆".repeat(5 - rating);

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
          playlistId: String(id),
          albumTitle: playlist?.name || "",
          albumArt: playlist?.image || playlist?.tracks?.[0]?.albumArt || "",
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
      fetch(`${API_URL}/api/reviews/playlist/${id}/rating`)
        .then((r) => r.json())
        .then((r) => setAvgRating(r))
        .catch(() => {});
    } catch {
      setReviewError("Server unavailable");
    }
  };

  const performDeleteReview = async () => {
    const reviewId = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!reviewId) return;
    try {
      const res = await fetch(`${API_URL}/api/reviews/${reviewId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r._id !== reviewId));
        fetch(`${API_URL}/api/reviews/playlist/${id}/rating`)
          .then((r) => r.json())
          .then((r) => setAvgRating(r))
          .catch(() => {});
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="ad-wrapper ad-loading pd-wrapper">
        <div className="discover-loader ad-loader-center">
          <span className="discover-loader-dot" />
          <span className="discover-loader-dot" />
          <span className="discover-loader-dot" />
        </div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="ad-wrapper ad-slide-in pd-wrapper">
        <p className="discover-empty">{error || "Mixtape not found"}</p>
        <button className="discover-clear-btn" onClick={() => navigate(-1)}>Go back</button>
      </div>
    );
  }

  // Cover: custom image or first track's album art
  const coverSrc = playlist.image || playlist.tracks?.[0]?.albumArt || "";

  return (
    <div className="ad-wrapper ad-slide-in pd-wrapper">
      {/* Dynamic glow: tint the page using the mixtape's cover image. */}
      <div
        className="ad-glow"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, rgb(${bgColor}) 0%, rgba(${bgColor}, 0.6) 30%, rgba(${bgColor}, 0.2) 60%, transparent 100%)`,
        }}
      />

      {/* Back button: returns the user to the previous screen without forcing a fixed route. */}
      <button className="ad-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>

      {/* Split layout: artwork and metadata on the left, track list on the right. */}
      <div className="ad-page">
        {/* LEFT: cover art, creator identity, description, and mood chips. */}
        <div className="ad-left">
          {coverSrc && (
            <img className="ad-cover" src={coverSrc} alt={playlist.name} />
          )}
          <div className="ad-left-info">
            <h1 className="ad-title">{playlist.name}</h1>

            <div className={`pd-visibility ${playlist.public ? "public" : "private"}`}>
              {playlist.public ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  PUBLIC
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  PRIVATE
                </>
              )}
            </div>

            {/* Creator info */}
            {playlist.creator && (
              <div
                className="pd-creator"
                onClick={() => navigate(`/profile/${playlist.creator._id}`)}
              >
                <img
                  src={playlist.creator.avatar || `https://api.dicebear.com/7.x/big-smile/svg?seed=${playlist.creator.username || playlist.creator._id}`}
                  alt=""
                  className="pd-creator-avatar"
                />
                <span className="pd-creator-name">
                  {playlist.creator.name || playlist.creator.username}
                </span>
              </div>
            )}

            {/* Description */}
            {playlist.description && (
              <p className="pd-description">{playlist.description}</p>
            )}

            {/* Mood tags */}
            {playlist.moods?.length > 0 && (
              <div className="pd-moods">
                {playlist.moods.map((mood, i) => (
                  <span key={i} className="pd-mood-chip">{mood}</span>
                ))}
              </div>
            )}

            {/* Average rating stars */}
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

        {/* RIGHT: summary stats and the playable track list. */}
        <div className="ad-right">
          <div className="ad-summary">
            {playlist.tracks?.length || 0} TRACKS
            <span className="ad-summary-dot">•</span>
            {totalDuration()} MINS
          </div>
          <div className="ad-tracks">
            {playlist.tracks?.map((track, i) => (
              <div
                key={track.trackId || i}
                className={`ad-track ${playingId === track.trackId ? "playing" : ""}`}
              >
                {track.albumArt ? (
                  <img src={track.albumArt} alt="" className="pd-track-art" />
                ) : (
                  <span className="ad-track-num">{i + 1}</span>
                )}
                <div className="ad-track-info">
                  <div className="ad-track-name">{track.name}</div>
                  <div className="ad-track-artist">{track.artist}</div>
                </div>
                <span className="ad-track-dur">{formatDuration(track.durationSec)}</span>
                {token && (
                  <button
                    className={`ad-track-heart ${likedTracks.includes(track.trackId) ? "liked" : ""}`}
                    onClick={() => toggleLike(track)}
                    title={likedTracks.includes(track.trackId) ? "Unlike" : "Like"}
                  >
                    {likedTracks.includes(track.trackId) ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M6.979 3.074a6 6 0 0 1 4.988 1.425l.037.033l.034-.03a6 6 0 0 1 4.733-1.44l.246.036a6 6 0 0 1 3.364 10.008l-.18.185l-.048.041l-7.45 7.379a1 1 0 0 1-1.313.082l-.094-.082l-7.493-7.422A6 6 0 0 1 6.979 3.074"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.5 12.572L12 20l-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572"/></svg>
                    )}
                  </button>
                )}
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

      {/* ======== REVIEWS SECTION ======== */}
      <div className="ad-reviews-section">
        <div className="ad-reviews-header">
          <h2 className="ad-reviews-title">REVIEWS ({reviews.length})</h2>
          <button
            className="ad-write-review-btn"
            onClick={() => token ? setShowReviewForm(!showReviewForm) : setShowSignInPopup(true)}
          >
            <svg width="28" height="28" viewBox="0 0 43 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="41" height="40" rx="20" stroke="#DB4A1E" strokeWidth="2"/>
              <path d="M23.3877 18.3486L23.6162 18.915L24.2246 18.9707L29.1484 19.4189L25.3711 22.8633L24.9424 23.2529L25.0684 23.8184L26.1875 28.8623L22.0361 26.2285L21.501 25.8887L20.9648 26.2285L16.8125 28.8643L17.9316 23.8203L18.0576 23.2549L17.6289 22.8643L13.8506 19.4199L18.7773 18.9717L19.3848 18.917L19.6133 18.3506L21.5 13.6719L23.3877 18.3486Z" stroke="#DB4A1E" strokeWidth="2"/>
            </svg>
            ADD A REVIEW
          </button>
        </div>

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

        <div className="ad-reviews-list">
          {reviews.slice(0, visibleReviews).map((review) => (
            <div key={review._id} className="ad-review-card">
              <div className="ad-review-body">
                <div className="ad-review-date">Posted {formatDate(review.createdAt)}</div>
                <div className="ad-review-card-title">{review.title || playlist.name}</div>
                <div className="ad-review-card-artist">{playlist.creator?.name || playlist.creator?.username || ""}</div>
                <div className="ad-review-userline">
                  <div className="ad-review-avatar">
                    <img
                      src={`https://api.dicebear.com/7.x/big-smile/svg?seed=${review.username || "user"}`}
                      alt={review.username}
                    />
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
                    onClick={() => setConfirmDeleteId(review._id)}
                    title="Delete review"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
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
                    src={playlist.image || playlist.tracks?.[0]?.albumArt || ""}
                    alt={playlist.name}
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

      {showSignInPopup && (
        <SignInPopup onClose={() => setShowSignInPopup(false)} />
      )}

      <ConfirmModal
        open={!!confirmDeleteId}
        title="Delete this review?"
        message="This action cannot be undone."
        confirmText="DELETE"
        cancelText="CANCEL"
        onConfirm={performDeleteReview}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
