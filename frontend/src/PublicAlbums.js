import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

export default function PublicAlbums() {
  // List of albums fetched from the public API
  const [albums, setAlbums] = useState([]);
  // Search input state
  const [query, setQuery] = useState("");
  // Error message for failed fetch
  const [error, setError] = useState("");

  useEffect(() => {
    // Load albums once when the page mounts
    fetch("http://localhost:5001/api/albums", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setAlbums(Array.isArray(data) ? data : []))
      .catch(() => setError("Unable to load albums."));
  }, []);

  const filtered = useMemo(() => {
    // Client-side filter by title/artist/genre/year
    const q = query.trim().toLowerCase();
    if (!q) return albums;
    return albums.filter((album) =>
      `${album.title || ""} ${album.artist || ""} ${album.genre || ""} ${
        album.year || ""
      }`
        .toLowerCase()
        .includes(q)
    );
  }, [albums, query]);

  return (
    <div className="app-shell">
      <header className="header-row">
        <div>
          <h1 className="brand">Mixtape.</h1>
          {/* Visitor-only page */}
          <p className="welcome">Browse albums as a visitor.</p>
        </div>
        <div className="auth-actions">
          <Link className="ghost-btn" to="/login">
            Login
          </Link>
          <Link className="primary-btn" to="/register">
            Register
          </Link>
        </div>
      </header>

      <section className="card">
        <input
          className="input search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search albums by title, artist, year, or genre"
        />
        {error ? <p className="error-text">{error}</p> : null}
        <div className="playlist-list">
          {/* Album cards */}
          {filtered.map((album) => (
            <div key={album._id} className="playlist-item">
              <div className="playlist-title">{album.title}</div>
              <div className="playlist-meta">
                {album.artist ? <span>{album.artist}</span> : null}
                {album.genre ? <span>{album.genre}</span> : null}
                {album.year ? <span>{album.year}</span> : null}
              </div>
            </div>
          ))}
          {!filtered.length && !error ? (
            // Empty-state message when search yields no results
            <p className="welcome">No albums found.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
