import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bgColor, setBgColor] = useState("40, 40, 40");
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

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
    fetch(`http://localhost:5001/api/playlists/detail/${id}`)
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

  if (loading) {
    return (
      <div className="ad-wrapper ad-slide-in pd-wrapper">
        <p className="discover-loading">Loading mixtape...</p>
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
      {/* Dynamic glow */}
      <div
        className="ad-glow"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, rgb(${bgColor}) 0%, rgba(${bgColor}, 0.6) 30%, rgba(${bgColor}, 0.2) 60%, transparent 100%)`,
        }}
      />

      {/* Back button */}
      <button className="ad-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>

      {/* Split layout */}
      <div className="ad-page">
        {/* LEFT: Cover + info */}
        <div className="ad-left">
          {coverSrc && (
            <img className="ad-cover" src={coverSrc} alt={playlist.name} />
          )}
          <div className="ad-left-info">
            <h1 className="ad-title">{playlist.name}</h1>

            {/* Creator info */}
            {playlist.creator && (
              <div
                className="pd-creator"
                onClick={() => navigate(`/profile/${playlist.creator._id}`)}
              >
                {playlist.creator.avatar ? (
                  <img src={playlist.creator.avatar} alt="" className="pd-creator-avatar" />
                ) : (
                  <div className="pd-creator-avatar pd-creator-avatar-fallback">
                    {(playlist.creator.name || playlist.creator.username || "?").charAt(0).toUpperCase()}
                  </div>
                )}
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
          </div>
        </div>

        {/* RIGHT: Track list */}
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
                <span className="ad-track-num">{i + 1}</span>
                <div className="ad-track-info">
                  <div className="ad-track-name">{track.name}</div>
                  <div className="ad-track-artist">{track.artist}</div>
                </div>
                <span className="ad-track-dur">{formatDuration(track.durationSec)}</span>
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
    </div>
  );
}
