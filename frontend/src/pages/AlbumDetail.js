import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

// =============================================
// Album Detail Page — shows a single album from Deezer
// with its full track list, cover art, and 30-second previews.
// Route: /album/:id (Deezer album ID)
// =============================================

export default function AlbumDetail() {
  const { id } = useParams();        // Deezer album ID from the URL
  const navigate = useNavigate();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Audio preview state
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  // ---- Stop audio when user navigates away ----
  // Cleanup runs on unmount so the preview doesn't keep playing on another page.
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // ---- Fetch album detail from our backend (which calls Deezer) ----
  useEffect(() => {
    fetch(`http://localhost:5001/api/music/album/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Album not found");
        return res.json();
      })
      .then((data) => setAlbum(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

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

  // ---- Format seconds to "m:ss" ----
  const formatDuration = (sec) => {
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return `${min}:${s.toString().padStart(2, "0")}`;
  };

  // Format total album duration to "Xm"
  const formatTotalDuration = (sec) => {
    const min = Math.round(sec / 60);
    return `${min} min`;
  };

  if (loading) {
    return (
      <div className="album-detail-page">
        <p className="discover-loading">Loading album...</p>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="album-detail-page">
        <p className="discover-empty">{error || "Album not found"}</p>
        <button className="discover-clear-btn" onClick={() => navigate("/discover")}>
          Back to Discover
        </button>
      </div>
    );
  }

  return (
    <div className="album-detail-page">
      <div className="album-detail-container">
        {/* ---- Album header: cover + info ---- */}
        <div className="album-detail-header">
          <img
            className="album-detail-cover"
            src={album.coverBig || album.cover}
            alt={album.title}
          />
          <div className="album-detail-info">
            <button className="album-detail-back" onClick={() => navigate(-1)}>
              &larr; Back
            </button>
            <h1 className="album-detail-title">{album.title}</h1>
            <p className="album-detail-artist">{album.artist}</p>
            <div className="album-detail-meta">
              {album.genre && <span>{album.genre}</span>}
              {album.releaseDate && <span>{album.releaseDate}</span>}
              {album.totalTracks && <span>{album.totalTracks} tracks</span>}
              {album.duration && <span>{formatTotalDuration(album.duration)}</span>}
            </div>
          </div>
        </div>

        {/* ---- Track list ---- */}
        <div className="album-detail-tracks">
          {album.tracks?.map((track, i) => (
            <div key={track.trackId || i} className="track-row">
              <span className="track-number">{i + 1}</span>
              <div className="track-info">
                <div className="track-name">{track.name}</div>
                <div className="track-artist">
                  {track.artist}
                  {track.durationSec ? ` · ${formatDuration(track.durationSec)}` : ""}
                </div>
              </div>
              <div className="track-actions">
                <button
                  className={`icon-btn play-btn ${playingId === track.trackId ? "playing" : ""}`}
                  onClick={() => togglePreview(track)}
                  title={playingId === track.trackId ? "Pause" : "Play preview"}
                >
                  {playingId === track.trackId ? "\u23F8" : "\u25B6"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
