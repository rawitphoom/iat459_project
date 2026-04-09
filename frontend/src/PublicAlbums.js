import { useEffect, useState, useRef, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";

// =============================================
// Discover Page — main exploration hub.
// 3-way toggle: TRACKS / ALBUMS / MIXTAPES (sliding pill)
// Search bar queries Deezer (tracks + albums) + filters mixtapes locally
// Filter dropdown: A-Z, Date Released, Genre
// =============================================

const TABS = ["TRACKS", "ALBUMS", "MIXTAPES"];

export default function Discover() {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  // ---- State ----
  const [activeTab, setActiveTab] = useState("ALBUMS");
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");

  // Chart data (loaded on mount)
  const [chartAlbums, setChartAlbums] = useState([]);
  const [chartTracks, setChartTracks] = useState([]);

  // Search results
  const [searchAlbums, setSearchAlbums] = useState([]);
  const [searchTracks, setSearchTracks] = useState([]);

  // Public playlists
  const [mixtapes, setMixtapes] = useState([]);

  // Audio preview
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [likedTracks, setLikedTracks] = useState([]);

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState("default"); // "default" | "az" | "date" | "genre"
  const [genreId, setGenreId] = useState(null);
  const [genreName, setGenreName] = useState("");
  const [genres, setGenres] = useState([]);
  const [genreMenuOpen, setGenreMenuOpen] = useState(false);
  const filterRef = useRef(null);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Load liked songs
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

  // Load chart + mixtapes + genres on mount
  useEffect(() => {
    Promise.all([
      fetch("http://localhost:5001/api/music/chart").then((r) => r.json()),
      fetch("http://localhost:5001/api/playlists/public").then((r) => r.json()),
      fetch("http://localhost:5001/api/music/genres").then((r) => r.json()).catch(() => []),
    ])
      .then(([chart, publicPlaylists, genreList]) => {
        setChartAlbums(chart.albums || []);
        setChartTracks(chart.tracks || []);
        setMixtapes(Array.isArray(publicPlaylists) ? publicPlaylists : []);
        setGenres(Array.isArray(genreList) ? genreList.filter((g) => g.id !== 0) : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Close filter dropdown on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const onClick = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
        setGenreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [filterOpen]);

  // Search handler — queries Deezer for tracks/albums; mixtapes filtered locally
  const handleSearch = async (e) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) {
      handleClear();
      return;
    }

    setLoading(true);
    setSearchedQuery(q);

    try {
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

  const handleClear = () => {
    setQuery("");
    setSearchedQuery("");
    setSearchAlbums([]);
    setSearchTracks([]);
  };

  // Audio preview
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
    return `${min}:${s.toString().padStart(2, "0")}`;
  };

  // ---- Apply sort/filter to display lists ----
  const isSearching = searchedQuery.length > 0;
  const baseAlbums = isSearching ? searchAlbums : chartAlbums;
  const baseTracks = isSearching ? searchTracks : chartTracks;
  const baseMixtapes = isSearching
    ? mixtapes.filter((m) => m.name?.toLowerCase().includes(searchedQuery.toLowerCase()))
    : mixtapes;

  const sortList = (list, getName, getDate) => {
    if (sortBy === "az") {
      return [...list].sort((a, b) => (getName(a) || "").localeCompare(getName(b) || ""));
    }
    if (sortBy === "date") {
      return [...list].sort((a, b) => {
        const da = getDate?.(a);
        const db = getDate?.(b);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return new Date(db) - new Date(da);
      });
    }
    return list;
  };

  const displayAlbums = useMemo(
    () => sortList(baseAlbums, (a) => a.title, (a) => a.releaseDate),
    [baseAlbums, sortBy]
  );
  const displayTracks = useMemo(
    () => sortList(baseTracks, (t) => t.name),
    [baseTracks, sortBy]
  );
  const displayMixtapes = useMemo(
    () => sortList(baseMixtapes, (m) => m.name, (m) => m.createdAt),
    [baseMixtapes, sortBy]
  );

  // Filter button label
  const filterLabel = useMemo(() => {
    if (sortBy === "az") return "A-Z";
    if (sortBy === "date") return "DATE RELEASED";
    if (sortBy === "genre" && genreName) return genreName.toUpperCase();
    return "";
  }, [sortBy, genreName]);

  const handlePickSort = (mode) => {
    setSortBy(mode);
    setFilterOpen(false);
    setGenreMenuOpen(false);
  };

  const handlePickGenre = async (g) => {
    setSortBy("genre");
    setGenreId(g.id);
    setGenreName(g.name);
    setFilterOpen(false);
    setGenreMenuOpen(false);
    // Fetch genre-specific chart from Deezer
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/api/music/chart?genreId=${g.id}`);
      const data = await res.json();
      setChartAlbums(data.albums || []);
      setChartTracks(data.tracks || []);
      handleClear();
    } catch {
      console.error("Genre filter failed");
    } finally {
      setLoading(false);
    }
  };

  const tabIndex = TABS.indexOf(activeTab);

  return (
    <div className="discover-page">
      {/* Title */}
      <h1 className="discover-hero">
        <span className="discover-hero-line">DISCOVER</span>
        <span className="discover-hero-line">
          TRENDING <span key={activeTab} className="discover-hero-accent">{activeTab}</span>
        </span>
      </h1>

      {/* Toggle + Filter row */}
      <div className="discover-controls-row">
        <div className={`discover-toggle pos-${tabIndex}`}>
          <span className="discover-toggle-slider" aria-hidden="true" />
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={`discover-toggle-opt ${activeTab === t ? "active" : ""}`}
              onClick={() => setActiveTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="discover-filter-wrap" ref={filterRef}>
          <button
            className={`discover-filter-btn ${filterLabel ? "has-value" : ""}`}
            onClick={() => setFilterOpen((o) => !o)}
            type="button"
          >
            {filterLabel && <span className="discover-filter-label">{filterLabel}</span>}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="11" y2="6"/><line x1="15" y1="6" x2="20" y2="6"/><circle cx="13" cy="6" r="2"/><line x1="4" y1="12" x2="7" y2="12"/><line x1="11" y1="12" x2="20" y2="12"/><circle cx="9" cy="12" r="2"/><line x1="4" y1="18" x2="14" y2="18"/><line x1="18" y1="18" x2="20" y2="18"/><circle cx="16" cy="18" r="2"/></svg>
          </button>

          {filterOpen && (
            <div className="discover-filter-menu">
              <button className={`discover-filter-item ${sortBy === "default" ? "active" : ""}`} onClick={() => handlePickSort("default")}>DEFAULT</button>
              <button className={`discover-filter-item ${sortBy === "az" ? "active" : ""}`} onClick={() => handlePickSort("az")}>A-Z</button>
              <button className={`discover-filter-item ${sortBy === "date" ? "active" : ""}`} onClick={() => handlePickSort("date")}>DATE RELEASED</button>
              <button
                className={`discover-filter-item discover-filter-item-parent ${sortBy === "genre" ? "active" : ""}`}
                onClick={() => setGenreMenuOpen((o) => !o)}
                type="button"
              >
                GENRE
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              {genreMenuOpen && (
                <div className="discover-filter-genre-list">
                  {genres.length === 0 && <div className="discover-filter-empty">No genres</div>}
                  {genres.map((g) => (
                    <button
                      key={g.id}
                      className={`discover-filter-item ${genreId === g.id ? "active" : ""}`}
                      onClick={() => handlePickGenre(g)}
                    >
                      {g.name.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search bar */}
      <form className="discover-search-bar" onSubmit={handleSearch}>
        <svg className="discover-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          className="discover-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
        />
        {isSearching && (
          <button type="button" className="discover-search-clear" onClick={handleClear} aria-label="Clear">×</button>
        )}
        <button type="submit" className="discover-search-submit">SEARCH</button>
      </form>

      {/* Loading */}
      {loading && <p className="discover-loading">Loading...</p>}

      {/* Albums */}
      {activeTab === "ALBUMS" && !loading && (
        <div className="album-grid">
          {displayAlbums.map((album) => (
            <div
              key={album.id}
              className="album-card"
              onClick={() => navigate(`/album/${album.id}`)}
              title={`${album.title} — ${album.artist}`}
            >
              <div className="album-card-img-wrapper">
                <img className="album-card-img" src={album.cover} alt={album.title} />
                <div className="album-card-overlay">
                  <span className="album-card-play">&#9654;</span>
                </div>
              </div>
              <div className="album-card-title">{album.title}</div>
              <div className="album-card-artist">{album.artist}</div>
            </div>
          ))}
          {displayAlbums.length === 0 && <p className="discover-empty">No albums found.</p>}
        </div>
      )}

      {/* Tracks */}
      {activeTab === "TRACKS" && !loading && (
        <div className="songs-list">
          {displayTracks.map((track, i) => (
            <div key={track.trackId || i} className="track-row">
              <span className="track-number">{i + 1}</span>
              {track.albumArt && <img className="track-art" src={track.albumArt} alt={track.album} />}
              <div className="track-info">
                <div className="track-name">{track.name}</div>
                <div className="track-artist">
                  {track.artist}
                  {track.durationSec ? ` · ${formatDuration(track.durationSec)}` : ""}
                </div>
              </div>
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
          {displayTracks.length === 0 && <p className="discover-empty">No songs found.</p>}
        </div>
      )}

      {/* Mixtapes */}
      {activeTab === "MIXTAPES" && !loading && (
        <div className="mixtapes-grid">
          {displayMixtapes.map((playlist) => (
            <div
              key={playlist._id}
              className="mixtape-card"
              onClick={() => navigate(`/playlist/${playlist._id}`)}
            >
              <div className="mixtape-card-img-wrapper">
                {playlist.image ? (
                  <img className="mixtape-card-img" src={playlist.image} alt={playlist.name} />
                ) : playlist.tracks?.[0]?.albumArt ? (
                  <img className="mixtape-card-img" src={playlist.tracks[0].albumArt} alt={playlist.name} />
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
          {displayMixtapes.length === 0 && (
            <p className="discover-empty">No mixtapes found.</p>
          )}
        </div>
      )}
    </div>
  );
}
