import { useEffect, useState, useRef, useCallback, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

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
    fetch(`http://localhost:5001/api/music/album/${id}`)
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
        fetch(`http://localhost:5001/api/reviews/album/${id}`)
          .then((r) => r.json())
          .then((revs) => setReviews(Array.isArray(revs) ? revs : []))
          .catch(() => {});
        fetch(`http://localhost:5001/api/reviews/album/${id}/rating`)
          .then((r) => r.json())
          .then((r) => setAvgRating(r))
          .catch(() => {});

        // Fetch more albums by the same artist
        if (data.artistId) {
          fetch(`http://localhost:5001/api/music/artist/${data.artistId}/albums`)
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
          fetch(`http://localhost:5001/api/favorites/albums/check/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => r.json())
            .then((r) => setSaved(r.isFavorited))
            .catch(() => {});

          fetch("http://localhost:5001/api/favorites/songs", {
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
      const res = await fetch("http://localhost:5001/api/playlists", {
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
        await fetch(`http://localhost:5001/api/favorites/songs/${track.trackId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch("http://localhost:5001/api/favorites/songs", {
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
        await fetch(`http://localhost:5001/api/playlists/${playlistId}/tracks/${track.trackId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch(`http://localhost:5001/api/playlists/${playlistId}/tracks`, {
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
        await fetch(`http://localhost:5001/api/favorites/albums/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch("http://localhost:5001/api/favorites/albums", {
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
      const res = await fetch("http://localhost:5001/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          albumId: String(id),
          albumTitle: album?.title || "",
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
      fetch(`http://localhost:5001/api/reviews/album/${id}/rating`)
        .then((r) => r.json())
        .then((r) => setAvgRating(r))
        .catch(() => {});
    } catch {
      setReviewError("Server unavailable");
    }
  };

  if (loading) {
    return (
      <div className="ad-page">
        <p className="discover-loading">Loading album...</p>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="ad-page">
        <p className="discover-empty">{error || "Album not found"}</p>
        <button className="discover-clear-btn" onClick={() => navigate("/discover")}>
          Back to Discover
        </button>
      </div>
    );
  }

  return (
    <div className="ad-wrapper">
      {/* ---- Dynamic glow background ---- */}
      <div
        className="ad-glow"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, rgb(${bgColor}) 0%, rgba(${bgColor}, 0.6) 30%, rgba(${bgColor}, 0.2) 60%, transparent 100%)`,
        }}
      />

      {/* ======== SPLIT SECTION: Cover + Tracks ======== */}
      <div className="ad-page">
        {/* ---- LEFT: Album cover + actions ---- */}
        <div className="ad-left">
          <img
            className="ad-cover"
            src={album.coverXl || album.cover}
            alt={album.title}
          />
          <div className="ad-cover-footer">
            <button
              className={`ad-save-btn ${saved ? "saved" : ""}`}
              onClick={toggleSaveAlbum}
            >
              {saved ? "✓  SAVED" : "＋  SAVE ALBUM"}
            </button>
            <div className="ad-rating">
              <span className="ad-rating-star">★</span>
              <span className="ad-rating-score">{avgRating.avg || "—"}</span>
              <span className="ad-rating-max">/ 5</span>
            </div>
          </div>
        </div>

        {/* ---- RIGHT: Info + Track list ---- */}
        <div className="ad-right">
          <span className="ad-label">Album</span>
          <h1 className="ad-title">{album.title}</h1>

          <div className="ad-meta">
            {album.artistPicture ? (
              <img className="ad-artist-avatar-img" src={album.artistPicture} alt={album.artist} />
            ) : (
              <div className="ad-artist-avatar">
                {album.artist?.charAt(0)}
              </div>
            )}
            <span className="ad-artist-name">{album.artist}</span>
            {getYear(album.releaseDate) && (
              <>
                <span className="ad-meta-dot">•</span>
                <span>{getYear(album.releaseDate)}</span>
              </>
            )}
            {album.totalTracks && (
              <>
                <span className="ad-meta-dot">•</span>
                <span>{album.totalTracks} Songs, {formatTotalDuration(album.duration)}</span>
              </>
            )}
          </div>

          <div className="ad-tracks">
            {album.tracks?.map((track, i) => (
              <div
                key={track.trackId || i}
                className={`ad-track ${playingId === track.trackId ? "playing" : ""}`}
              >
                <span className="ad-track-num">{i + 1}</span>
                <div className="ad-track-info">
                  <div className="ad-track-name">{track.name}</div>
                  <div className="ad-track-artist">{track.artist}</div>
                </div>
                <span className="ad-track-dur">
                  {track.durationSec ? formatDuration(track.durationSec) : ""}
                </span>
                <button
                  className={`ad-track-heart ${likedTracks.includes(track.trackId) ? "liked" : ""}`}
                  onClick={(e) => openHeartPopup(e, track)}
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
                  {playingId === track.trackId ? "❚❚" : "▶"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ======== MORE BY ARTIST ======== */}
      {moreAlbums.length > 0 && (
        <div className="ad-more">
          <h2 className="ad-more-title">More by {album.artist}</h2>
          <div className="ad-more-grid">
              {moreAlbums.map((a) => (
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
                  <div className="ad-more-name">{a.title}</div>
                  <div className="ad-more-year">
                    {a.releaseDate?.split("-")[0] || ""}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ======== REVIEWS SECTION ======== */}
      <div className="ad-reviews-section">
        <div className="ad-reviews-header">
          <h2 className="ad-reviews-title">Reviews</h2>
          <button
            className="ad-write-review-btn"
            onClick={() => setShowReviewForm(!showReviewForm)}
          >
            ✎ WRITE A REVIEW
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

        {/* Review cards grid */}
        <div className="ad-reviews-grid">
          {reviews.slice(0, visibleReviews).map((review) => (
            <div key={review._id} className="ad-review-card">
              <div className="ad-review-card-header">
                <div className="ad-review-avatar">
                  {review.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="ad-review-username">
                    Review by <strong>{review.username}</strong>
                  </div>
                  <div className="ad-review-date">
                    Listened on {formatDate(review.createdAt)}
                  </div>
                </div>
              </div>
              {review.title && (
                <div className="ad-review-card-title">{review.title}</div>
              )}
              <div className="ad-review-stars">{renderStars(review.rating)}</div>
              <p className="ad-review-text">{review.text}</p>
              <div className="ad-review-footer">
                <span className="ad-review-likes">♥ {review.likes || 0}</span>
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
