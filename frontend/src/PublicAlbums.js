import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

// =============================================
// Discover Page — the main exploration hub for Mixtape.
// Tabs: Songs | Albums | Mixtapes (public playlists)
// On load: shows chart/trending content from Deezer.
// On search: queries Deezer API for matching results.
// =============================================

const TABS = ["Songs", "Albums", "Mixtapes"];

export default function Discover() {
  const navigate = useNavigate();

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
      .finally(() => setLoading(false));
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
        <p className="discover-subtitle">
          {isSearching
            ? `Results for "${searchedQuery}"`
            : "Trending right now"}
        </p>

        {/* Search bar */}
        <form className="discover-search" onSubmit={handleSearch}>
          <input
            className="discover-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, albums, artists..."
          />
          <button className="discover-search-btn" type="submit">
            Search
          </button>
          {isSearching && (
            <button className="discover-clear-btn" type="button" onClick={handleClear}>
              Clear
            </button>
          )}
        </form>

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

              {/* Play/pause 30-second preview */}
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
    </div>
  );
}
