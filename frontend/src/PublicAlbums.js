import { useEffect, useLayoutEffect, useState, useRef, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import { SignInPopup } from "./pages/AlbumDetail";
import API_URL from "./config";

/*
 * PublicAlbums / Discover — the main browse-and-search page.
 * Routes: /discover and /search
 *
 * The page supports three content modes:
 * - TRACKS: Deezer search/chart tracks with preview playback + likes
 * - ALBUMS: Deezer chart/search albums that link to album detail pages
 * - MIXTAPES: public user playlists filtered locally in the frontend
 *
 * The surrounding controls let users search, sort, and filter without leaving
 * the page, so this component acts like a compact exploration hub.
 */

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
  const [showSignInPopup, setShowSignInPopup] = useState(false);

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState("default"); // "default" | "az" | "date" | "genre"
  const [genreId, setGenreId] = useState(null);
  const [genreName, setGenreName] = useState("");
  const [genres, setGenres] = useState([]);
  const [genreMenuOpen, setGenreMenuOpen] = useState(false);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null);
  // Infinite-scroll state for the chart (only used when not searching/genre-locked)
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [chartExhausted, setChartExhausted] = useState(false);
  const [fallbackPage, setFallbackPage] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const sentinelRef = useRef(null);
  const filterRef = useRef(null);
  const filterSizerRef = useRef(null);
  const filterLabelWrapRef = useRef(null);

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
    if (!token) {
      setShowSignInPopup(true);
      return;
    }
    const isLiked = likedTracks.includes(track.trackId);
    const method = isLiked ? "DELETE" : "POST";
    try {
      await fetch(`${API_URL}/api/favorites/songs`, {
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
      fetch(`${API_URL}/api/music/chart?limit=50`).then((r) => r.json()),
      fetch(`${API_URL}/api/playlists/public`).then((r) => r.json()),
      fetch(`${API_URL}/api/music/genres`).then((r) => r.json()).catch(() => []),
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

  // ---- Infinite scroll: fetch next page of chart albums/tracks ----
  // Phase 1: paginate the global chart. Phase 2 (after exhaustion): cycle
  // through genre charts via /api/music/more-albums so the feed stays "infinite".
  const loadMoreChart = async () => {
    if (loadingMore || !hasMore) return;
    if (searchedQuery || sortBy === "genre") return;
    setLoadingMore(true);
    try {
      let url;
      if (!chartExhausted) {
        url = `${API_URL}/api/music/chart?index=${chartAlbums.length}&limit=50`;
      } else {
        url = `${API_URL}/api/music/more-albums?page=${fallbackPage}&limit=50`;
      }
      const res = await fetch(url);
      const data = await res.json();
      const newAlbums = data.albums || [];
      const newTracks = data.tracks || [];

      if (!chartExhausted && newAlbums.length === 0 && newTracks.length === 0) {
        // Global chart ran out — switch to genre-fallback mode and let the next tick load
        setChartExhausted(true);
        setLoadingMore(false);
        return;
      }

      if (chartExhausted && newAlbums.length === 0 && newTracks.length === 0) {
        // Even the fallback returned nothing — give up
        setHasMore(false);
      } else {
        // De-duplicate by id in case Deezer returns overlapping items
        setChartAlbums((prev) => {
          const seen = new Set(prev.map((a) => a.id));
          return [...prev, ...newAlbums.filter((a) => !seen.has(a.id))];
        });
        setChartTracks((prev) => {
          const seen = new Set(prev.map((t) => t.trackId));
          return [...prev, ...newTracks.filter((t) => !seen.has(t.trackId))];
        });
        if (chartExhausted) setFallbackPage((p) => p + 1);
      }
    } catch (err) {
      console.error("Load more failed", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Back-to-top button: show after user scrolls down 600px
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // IntersectionObserver: trigger loadMore when sentinel is near viewport
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreChart();
      },
      { rootMargin: "400px" }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [chartAlbums.length, chartTracks.length, loadingMore, hasMore, searchedQuery, sortBy]);

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
        fetch(`${API_URL}/api/music/search?q=${encodeURIComponent(q)}`).then((r) => r.json()),
        fetch(`${API_URL}/api/music/albums?q=${encodeURIComponent(q)}`).then((r) => r.json()),
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

  // Stable shuffle key per item id — assigned the first time we see an item
  // and reused on every render so newly-loaded items don't reshuffle existing ones.
  const shuffleKeyRef = useRef(new Map());
  const getShuffleKey = (id) => {
    const map = shuffleKeyRef.current;
    if (!map.has(id)) map.set(id, Math.random());
    return map.get(id);
  };

  const sortList = (list, getName, getDate, getId) => {
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
    if (sortBy === "default") {
      // Stable random sort — each item's shuffle key is cached by id, so
      // new pages get inserted into random positions without disturbing
      // the already-rendered items (no scroll jump on infinite scroll).
      return [...list].sort((a, b) => getShuffleKey(getId(a)) - getShuffleKey(getId(b)));
    }
    return list;
  };

  const displayAlbums = useMemo(() => {
    let list = sortList(baseAlbums, (a) => a.title, (a) => a.releaseDate, (a) => a.id);
    if (sortBy === "date" && selectedYear != null) {
      // selectedYear stores a decade (e.g., 2020) — match any year within 2020-2029
      const decadeStart = Number(selectedYear);
      list = list.filter((a) => {
        const y = parseInt((a.releaseDate || "").slice(0, 4), 10);
        return !isNaN(y) && y >= decadeStart && y < decadeStart + 10;
      });
    }
    return list;
  }, [baseAlbums, sortBy, selectedYear]);
  const displayTracks = useMemo(
    () => sortList(baseTracks, (t) => t.name, undefined, (t) => t.trackId),
    [baseTracks, sortBy]
  );
  const displayMixtapes = useMemo(
    () => sortList(baseMixtapes, (m) => m.name, (m) => m.createdAt, (m) => m._id),
    [baseMixtapes, sortBy]
  );

  // Measure the new label's width and set it explicitly so CSS can
  // transition from the old width to the new — gives a pure horizontal
  // morph without any vertical shift/fade.
  useLayoutEffect(() => {
    const wrap = filterLabelWrapRef.current;
    const sizer = filterSizerRef.current;
    if (!wrap || !sizer) return;
    const newWidth = sizer.getBoundingClientRect().width;
    wrap.style.width = `${newWidth}px`;
  });

  // Unique decades (e.g., "2020s", "2010s") available across the current album list
  const availableDecades = useMemo(() => {
    const set = new Set();
    baseAlbums.forEach((a) => {
      const y = parseInt((a.releaseDate || "").slice(0, 4), 10);
      if (!isNaN(y)) set.add(Math.floor(y / 10) * 10);
    });
    return [...set].sort((a, b) => b - a);
  }, [baseAlbums]);

  // Filter button label — always show something (defaults to DEFAULT)
  const filterLabel = useMemo(() => {
    if (sortBy === "az") return "A-Z";
    if (sortBy === "date") return "DATE RELEASED";
    if (sortBy === "genre" && genreName) return genreName.toUpperCase();
    return "DEFAULT";
  }, [sortBy, genreName]);

  const handlePickSort = (mode) => {
    setSortBy(mode);
    if (mode !== "date") {
      setSelectedYear(null);
      setDateMenuOpen(false);
      setFilterOpen(false);
    }
    setGenreMenuOpen(false);
  };

  const handlePickGenre = async (g) => {
    setSortBy("genre");
    setGenreId(g.id);
    setGenreName(g.name);
    setFilterOpen(false);
    setGenreMenuOpen(false);
    setHasMore(false); // disable infinite scroll for genre-locked chart
    // Fetch genre-specific chart from Deezer
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/music/chart?genreId=${g.id}`);
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
            className={`discover-filter-btn ${sortBy !== "default" ? "has-value" : ""} ${filterOpen ? "open" : ""}`}
            onClick={() => setFilterOpen((o) => !o)}
            type="button"
          >
            <span className="discover-filter-label-wrap" ref={filterLabelWrapRef}>
              <span className="discover-filter-label-sizer" ref={filterSizerRef} aria-hidden="true">{filterLabel}</span>
              <span className="discover-filter-label" key={filterLabel}>{filterLabel}</span>
            </span>
            <svg className="discover-filter-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="11" y2="6"/><line x1="15" y1="6" x2="20" y2="6"/><circle cx="13" cy="6" r="2"/><line x1="4" y1="12" x2="7" y2="12"/><line x1="11" y1="12" x2="20" y2="12"/><circle cx="9" cy="12" r="2"/><line x1="4" y1="18" x2="14" y2="18"/><line x1="18" y1="18" x2="20" y2="18"/><circle cx="16" cy="18" r="2"/></svg>
          </button>

          <div className={`discover-filter-menu ${filterOpen ? "open" : ""}`}>
            <button className={`discover-filter-item ${sortBy === "default" ? "active" : ""}`} onClick={() => handlePickSort("default")}>DEFAULT</button>
            <button className={`discover-filter-item ${sortBy === "az" ? "active" : ""}`} onClick={() => handlePickSort("az")}>A-Z</button>
            <button
              className={`discover-filter-item discover-filter-item-parent ${sortBy === "date" ? "active" : ""}`}
              onClick={() => { handlePickSort("date"); setDateMenuOpen((o) => !o); }}
              type="button"
            >
              DATE RELEASED
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            {dateMenuOpen && (
              <div className="discover-filter-genre-list">
                {availableDecades.length === 0 && <div className="discover-filter-empty">No decades</div>}
                {availableDecades.map((d) => (
                  <button
                    key={d}
                    className={`discover-filter-item ${selectedYear === d ? "active" : ""}`}
                    onClick={() => setSelectedYear((cur) => (cur === d ? null : d))}
                  >
                    {selectedYear === d ? "✓ " : ""}{d}s
                  </button>
                ))}
              </div>
            )}
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
      {loading && (
        <div className="discover-loader">
          <span className="discover-loader-dot" />
          <span className="discover-loader-dot" />
          <span className="discover-loader-dot" />
        </div>
      )}

      {/* Albums */}
      {activeTab === "ALBUMS" && !loading && (
        <div className="album-grid discover-fade-in" key={`albums-${sortBy}-${genreId}-${searchedQuery}`}>
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

      {/* Infinite-scroll sentinel + status (only shown on chart browse) */}
      {!loading && !searchedQuery && sortBy !== "genre" && (activeTab === "ALBUMS" || activeTab === "TRACKS") && (
        <div ref={sentinelRef} className="discover-load-more">
          {loadingMore && <span className="discover-loading">Loading more...</span>}
          {!loadingMore && !hasMore && <span className="discover-loading">You've explored every corner — that's everything we have.</span>}
        </div>
      )}

      {/* Tracks */}
      {activeTab === "TRACKS" && !loading && (
        <div className="songs-list discover-fade-in" key={`tracks-${sortBy}-${genreId}-${searchedQuery}`}>
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
        <div className="mixtapes-grid discover-fade-in" key={`mixtapes-${sortBy}-${genreId}-${searchedQuery}`}>
          {displayMixtapes.map((playlist) => {
            // Collect up to 4 unique album art images for the collage
            const arts = [];
            const seen = new Set();
            for (const t of playlist.tracks || []) {
              if (t.albumArt && !seen.has(t.albumArt)) {
                seen.add(t.albumArt);
                arts.push(t.albumArt);
                if (arts.length >= 4) break;
              }
            }
            const creatorName = playlist.creator?.name || playlist.creator?.username || "";
            const creatorUsername = playlist.creator?.username || "";
            const creatorAvatar = playlist.creator?.avatar;

            return (
              <div
                key={playlist._id}
                className="mixtape-card"
                onClick={() => navigate(`/playlist/${playlist._id}`)}
              >
                <div className="mixtape-card-img-wrapper">
                  {playlist.image ? (
                    <img className="mixtape-card-img" src={playlist.image} alt={playlist.name} />
                  ) : arts.length >= 4 ? (
                    <div className="mixtape-card-collage">
                      {arts.map((src, i) => (
                        <img key={i} className="mixtape-card-collage-img" src={src} alt="" />
                      ))}
                    </div>
                  ) : arts.length > 0 ? (
                    <img className="mixtape-card-img" src={arts[0]} alt={playlist.name} />
                  ) : (
                    <div className="mixtape-card-placeholder">&#9835;</div>
                  )}
                </div>
                <div className="mixtape-card-creator-row">
                  <div className="mixtape-card-avatar">
                    <img
                      src={creatorAvatar || `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(creatorUsername || creatorName || "user")}`}
                      alt={creatorName}
                    />
                  </div>
                  <div className="mixtape-card-creator-info">
                    <div className="mixtape-card-title">{playlist.name}</div>
                    {creatorUsername && <div className="mixtape-card-creator">{creatorUsername}</div>}
                  </div>
                </div>
              </div>
            );
          })}
          {displayMixtapes.length === 0 && (
            <p className="discover-empty">No mixtapes found.</p>
          )}
        </div>
      )}

      {showSignInPopup && <SignInPopup onClose={() => setShowSignInPopup(false)} />}

      {/* Back-to-top floating button */}
      <button
        className={`discover-back-to-top ${showBackToTop ? "visible" : ""}`}
        onClick={scrollToTop}
        aria-label="Back to top"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </button>
    </div>
  );
}
