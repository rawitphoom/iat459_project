import { useState, useContext, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function WriteReview() {
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);

  // Stage: "search" or "write"
  const [stage, setStage] = useState("search");

  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  // Selected album
  const [album, setAlbum] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [saved, setSaved] = useState(false);

  // Review form
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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

  // Real-time search with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`http://localhost:5001/api/music/albums?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const selectAlbum = async (albumResult) => {
    try {
      const res = await fetch(`http://localhost:5001/api/music/album/${albumResult.id}`);
      const data = await res.json();
      setAlbum({
        ...data,
        cover_xl: data.coverXl || data.cover,
        release_date: data.releaseDate,
        artist: { name: data.artist },
      });
      setTracks(data.tracks || []);
      setStage("write");
    } catch {
      setAlbum(albumResult);
      setTracks([]);
      setStage("write");
    }

    // Check if already saved
    if (token) {
      try {
        const checkRes = await fetch(`http://localhost:5001/api/favorites/albums/check/${albumResult.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const checkData = await checkRes.json();
        setSaved(checkData.isFavorited);
      } catch {
        setSaved(false);
      }
    }
  };

  const toggleSaveAlbum = async () => {
    if (!token || !album) return;
    try {
      if (saved) {
        await fetch(`http://localhost:5001/api/favorites/albums/${album.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        setSaved(false);
      } else {
        await fetch("http://localhost:5001/api/favorites/albums", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            albumId: String(album.id),
            title: album.title,
            artist: album.artist?.name || "",
            cover: album.cover_xl || album.cover,
          }),
        });
        setSaved(true);
      }
    } catch {}
  };

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
    return `${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!rating) { setError("Please select a rating."); return; }
    if (!token) { setError("You must be logged in."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("http://localhost:5001/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          albumId: String(album.id),
          albumTitle: album.title || "",
          albumArt: album.cover_big || album.cover_medium || album.cover || "",
          title,
          rating,
          text,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || "Failed to submit"); setSubmitting(false); return; }
      setSuccess(true);
      setTimeout(() => {
        navigate("/dashboard");
        window.scrollTo(0, 0);
      }, 2000);
    } catch {
      setError("Server unavailable");
      setSubmitting(false);
    }
  };

  return (
    <div className="wr-page">
      <button className="wr-back" onClick={() => stage === "write" ? setStage("search") : navigate(-1)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>

      <h1 className="wr-title">WRITING MY <span className="wr-title-accent">REVIEW</span></h1>

      {/* ======== SEARCH STAGE ======== */}
      {stage === "search" && (
        <div className="wr-search-stage">
          <p className="wr-search-label">BROWSE ALBUMS</p>
          <form className="wr-search-bar" onSubmit={handleSearch}>
            <input
              className="wr-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder=""
            />
            <button className="wr-search-btn" type="submit" disabled={searching}>
              SEARCH
            </button>
          </form>

          <div className="wr-results">
            {searching && results.length === 0 && (
              <p className="wr-searching">Searching...</p>
            )}
            {results.map((a) => (
              <div key={a.id} className="wr-result-row">
                <img className="wr-result-img" src={a.cover_medium || a.cover} alt={a.title} />
                <div className="wr-result-info">
                  <div className="wr-result-name">{a.title}</div>
                  <div className="wr-result-artist">{a.artist?.name || ""}</div>
                </div>
                <button className="wr-result-btn" onClick={() => selectAlbum(a)}>
                  WRITE A REVIEW
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======== WRITE STAGE ======== */}
      {stage === "write" && album && (
        <div className="wr-write-stage">
          <div className="wr-album-section">
            <div className="wr-album-left">
              <img
                className="wr-album-cover"
                src={album.cover_xl || album.cover_big || album.cover_medium || album.cover}
                alt={album.title}
              />
              <div className="wr-album-meta">
                <h2 className="wr-album-title">{album.title}</h2>
                <span className="wr-album-year">
                  {album.release_date ? new Date(album.release_date).getFullYear() : ""}
                </span>
              </div>
              <p className="wr-album-artist">{album.artist?.name || ""}</p>
              <button className={`wr-save-btn ${saved ? "saved" : ""}`} onClick={toggleSaveAlbum}>
                {saved ? "Saved" : "Save Album"}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M6.979 3.074a6 6 0 0 1 4.988 1.425l.037.033l.034-.03a6 6 0 0 1 4.733-1.44l.246.036a6 6 0 0 1 3.364 10.008l-.18.185l-.048.041l-7.45 7.379a1 1 0 0 1-1.313.082l-.094-.082l-7.493-7.422A6 6 0 0 1 6.979 3.074"/>
                </svg>
              </button>
            </div>

            <div className="wr-album-right">
              <p className="wr-track-count">{tracks.length} TRACKS</p>
              <div className="wr-track-list">
                {tracks.map((t) => (
                  <div key={t.trackId} className={`wr-track ${playingId === t.trackId ? "playing" : ""}`}>
                    <span className="wr-track-name">{t.name}</span>
                    <button
                      className={`wr-track-play ${playingId === t.trackId ? "active" : ""}`}
                      onClick={() => togglePreview(t)}
                    >
                      {playingId === t.trackId ? "❚❚" : "▶"}
                    </button>
                    <span className="wr-track-dur">{formatDuration(t.durationSec)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Review Form */}
          <form className="wr-form" onSubmit={handleSubmit}>
            <div className="wr-form-header">
              <img
                className="wr-avatar"
                src={`https://api.dicebear.com/7.x/big-smile/svg?seed=${user?.username || "user"}`}
                alt=""
              />
              <div>
                <p className="wr-form-label">{user?.username?.toUpperCase() || "USER"}</p>
                <div className="wr-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className={`wr-star ${n <= rating ? "active" : ""}`}
                      onClick={() => setRating(n)}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <label className="wr-form-label">REVIEW TITLE</label>
            <input
              className="wr-form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <label className="wr-form-label">ADD A REVIEW</label>
            <textarea
              className="wr-form-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
            />

            {error && <div className="wr-error">{error}</div>}

            <button className="wr-submit" type="submit" disabled={submitting}>
              {submitting ? "SUBMITTING..." : "SUBMIT"}
            </button>
          </form>
        </div>
      )}

      {/* Success popup */}
      {success && (
        <div className="wr-success-overlay">
          <div className="wr-success-popup">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="16 8 10 16 7 13"/></svg>
            <h2 className="wr-success-title">Review Submitted!</h2>
            <p className="wr-success-text">Your review has been posted successfully.</p>
            <p className="wr-success-redirect">Redirecting to dashboard...</p>
          </div>
        </div>
      )}
    </div>
  );
}
