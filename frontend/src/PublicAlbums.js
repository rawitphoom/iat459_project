import { useEffect, useState, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";

// =============================================
// Discover Page — the main exploration hub for Mixtape.
// Tabs: Songs | Albums | Mixtapes (public playlists)
// On load: shows chart/trending content from Deezer.
// On search: queries Deezer API for matching results.
// =============================================

const TABS = ["Songs", "Albums", "Mixtapes"];

export default function Discover() {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  // ---- State ----
  const [activeTab, setActiveTab] = useState("Albums");
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState(""); // tracks what was actually searched

  // Chart data (loaded on mount — trending content)
  const [chartAlbums, setChartAlbums] = useState([]);
  const [chartTracks, setChartTracks] = useState([]);

  // Search results
  const [searchAlbums, setSearchAlbums] = useState([]);
  const [searchTracks, setSearchTracks] = useState([]);

  // Public playlists (Mixtapes tab)
  const [mixtapes, setMixtapes] = useState([]);

  // Audio preview state
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [searchBarVisible, setSearchBarVisible] = useState(false);
  const [likedTracks, setLikedTracks] = useState([]);

  // ---- Stop audio when user navigates away ----
  // useEffect cleanup runs when the component unmounts (user leaves the page).
  // This prevents the 30-second preview from continuing on another page.
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // ---- Load liked songs on mount ----
  useEffect(() => {
    if (!token) return;
    fetch("http://localhost:5001/api/favorites/songs", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((favs) => {
        if (Array.isArray(favs)) setLikedTracks(favs.map((f) => f.trackId));
      })
      .catch(() => {});
  }, [token]);

  // ---- Toggle like a song ----
  const toggleLike = async (track) => {
    if (!token) return navigate("/login");
    const isLiked = likedTracks.includes(track.trackId);
    const method = isLiked ? "DELETE" : "POST";
    try {
      await fetch("http://localhost:5001/api/favorites/songs", {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          trackId: track.trackId,
          name: track.name,
          artist: track.artist,
          albumArt: track.albumArt,
          previewUrl: track.previewUrl,
        }),
      });
      setLikedTracks((prev) =>
        isLiked ? prev.filter((id) => id !== track.trackId) : [...prev, track.trackId]
      );
    } catch {}
  };

  // ---- Load chart data + public playlists on mount ----
  useEffect(() => {
    // Fetch chart and mixtapes in parallel
    Promise.all([
      fetch("http://localhost:5001/api/music/chart").then((r) => r.json()),
      fetch("http://localhost:5001/api/playlists/public").then((r) => r.json()),
    ])
      .then(([chart, publicPlaylists]) => {
        setChartAlbums(chart.albums || []);
        setChartTracks(chart.tracks || []);
        setMixtapes(Array.isArray(publicPlaylists) ? publicPlaylists : []);
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        // Slide up search bar after albums load
        setTimeout(() => setSearchBarVisible(true), 300);
      });
  }, []);

  // ---- Search handler ----
  const handleSearch = async (e) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setSearchedQuery(q);

    try {
      // Search both tracks and albums from Deezer in parallel
      const [tracks, albums] = await Promise.all([
        fetch(`http://localhost:5001/api/music/search?q=${encodeURIComponent(q)}`).then((r) => r.json()),
        fetch(`http://localhost:5001/api/music/albums?q=${encodeURIComponent(q)}`).then((r) => r.json()),
      ]);

      setSearchTracks(Array.isArray(tracks) ? tracks : []);
      setSearchAlbums(Array.isArray(albums) ? albums : []);
    } catch {
      console.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  // ---- Clear search and go back to chart ----
  const handleClear = () => {
    setQuery("");
    setSearchedQuery("");
    setSearchAlbums([]);
    setSearchTracks([]);
  };

  // ---- Audio preview toggle (play/pause 30-second clip) ----
  const togglePreview = (track) => {
    if (!track.previewUrl) return;

    // If same track is playing, pause it
    if (playingId === track.trackId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    // Pause any current track and play new one
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

  // Decide which data to show: search results or chart data
  const isSearching = searchedQuery.length > 0;
  const displayAlbums = isSearching ? searchAlbums : chartAlbums;
  const displayTracks = isSearching ? searchTracks : chartTracks;

  return (
    <div className="discover-page">
      {/* ---- Header + Search Bar ---- */}
      <div className="discover-header">
        <h1 className="discover-title">Discover</h1>
        <div className="discover-hero-text">
          {isSearching ? (
            <p className="discover-subtitle">Results for "{searchedQuery}"</p>
          ) : (
            <>
              <span className="discover-hero-line discover-hero-indent">TRENDING</span>
              <span className="discover-hero-line">NOW</span>
            </>
          )}
        </div>

        {/* Tabs — Songs | Albums | Mixtapes */}
        <div className="discover-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`discover-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Loading state ---- */}
      {loading && <p className="discover-loading">Loading...</p>}

      {/* ---- Albums Tab ---- */}
      {activeTab === "Albums" && !loading && (
        <div className="album-grid">
          {displayAlbums.map((album) => (
            <div
              key={album.id}
              className="album-card"
              onClick={() => navigate(`/album/${album.id}`)}
              title={`${album.title} — ${album.artist}`}
            >
              {/* Album cover art from Deezer */}
              <div className="album-card-img-wrapper">
                <img
                  className="album-card-img"
                  src={album.cover}
                  alt={album.title}
                />
                {/* Hover overlay with play icon */}
                <div className="album-card-overlay">
                  <span className="album-card-play">&#9654;</span>
                </div>
              </div>
              <div className="album-card-title">{album.title}</div>
              <div className="album-card-artist">{album.artist}</div>
            </div>
          ))}
          {displayAlbums.length === 0 && (
            <p className="discover-empty">No albums found.</p>
          )}
        </div>
      )}

      {/* ---- Songs Tab ---- */}
      {activeTab === "Songs" && !loading && (
        <div className="songs-list">
          {displayTracks.map((track, i) => (
            <div key={track.trackId || i} className="track-row">
              {/* Track number or chart position */}
              <span className="track-number">{i + 1}</span>

              {/* Album art */}
              {track.albumArt && (
                <img className="track-art" src={track.albumArt} alt={track.album} />
              )}

              {/* Track info */}
              <div className="track-info">
                <div className="track-name">{track.name}</div>
                <div className="track-artist">
                  {track.artist}
                  {track.durationSec ? ` · ${formatDuration(track.durationSec)}` : ""}
                </div>
              </div>

              {/* Heart + Play actions */}
              <div className="track-actions">
                <button
                  className={`discover-track-heart ${likedTracks.includes(track.trackId) ? "liked" : ""}`}
                  onClick={() => toggleLike(track)}
                  title={likedTracks.includes(track.trackId) ? "Unlike" : "Like"}
                >
                  {likedTracks.includes(track.trackId) ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M6.979 3.074a6 6 0 0 1 4.988 1.425l.037.033l.034-.03a6 6 0 0 1 4.733-1.44l.246.036a6 6 0 0 1 3.364 10.008l-.18.185l-.048.041l-7.45 7.379a1 1 0 0 1-1.313.082l-.094-.082l-7.493-7.422A6 6 0 0 1 6.979 3.074"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.5 12.572L12 20l-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572"/></svg>
                  )}
                </button>
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
          {displayTracks.length === 0 && (
            <p className="discover-empty">No songs found.</p>
          )}
        </div>
      )}

      {/* ---- Mixtapes Tab (public user-created playlists) ---- */}
      {activeTab === "Mixtapes" && !loading && (
        <div className="mixtapes-grid">
          {mixtapes.map((playlist) => (
            <div
              key={playlist._id}
              className="mixtape-card"
              onClick={() => navigate(`/playlist/${playlist._id}`)}
            >
              {/* Show the first track's album art as the mixtape cover */}
              <div className="mixtape-card-img-wrapper">
                {playlist.tracks?.[0]?.albumArt ? (
                  <img
                    className="mixtape-card-img"
                    src={playlist.tracks[0].albumArt}
                    alt={playlist.name}
                  />
                ) : (
                  <div className="mixtape-card-placeholder">&#9835;</div>
                )}
              </div>
              <div className="album-card-title">{playlist.name}</div>
              <div className="album-card-artist">
                {playlist.tracks?.length || 0} tracks
                {playlist.mood ? ` · ${playlist.mood}` : ""}
              </div>
            </div>
          ))}
          {mixtapes.length === 0 && (
            <p className="discover-empty">
              No public mixtapes yet. Create a playlist and make it public!
            </p>
          )}
        </div>
      )}

      {/* ---- Floating glass search bar ---- */}
      <form
        className={`discover-floating-search ${searchBarVisible ? "visible" : ""}`}
        onSubmit={handleSearch}
      >
        <svg className="discover-floating-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          className="discover-floating-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find your favorite artists"
        />
        {isSearching && (
          <button className="discover-floating-clear-btn" type="button" onClick={handleClear}>
            &#10005;
          </button>
        )}
      </form>
    </div>
  );
}
