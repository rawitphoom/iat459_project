import { useEffect, useMemo, useState } from "react";
// Import TrackSearch so visitors can search and preview songs without logging in
import TrackSearch from "./TrackSearch";

export default function PublicAlbums() {
  const [albums, setAlbums] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://localhost:5001/api/albums", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setAlbums(Array.isArray(data) ? data : []))
      .catch(() => setError("Unable to load albums."));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return albums;
    return albums.filter((album) =>
      `${album.title || ""} ${album.artist || ""} ${album.genre || ""} ${album.year || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [albums, query]);

  return (
    <div className="app-shell">
      <h2 className="brand" style={{ marginBottom: 4 }}>Discover</h2>
      <p className="welcome" style={{ marginBottom: 16 }}>Browse albums and search for songs.</p>

      {/* Song search with click-to-play previews — available to all visitors */}
      <section className="card">
        <h3>Search Songs</h3>
        <TrackSearch onAddTrack={() => {}} selectedTracks={[]} hideAdd />
      </section>

      <section className="card">
        <h3>Albums</h3>
        <input className="input search-input" value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search albums by title, artist, year, or genre" />
        {error && <p className="error-text">{error}</p>}
        <div className="playlist-list">
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
          {!filtered.length && !error && <p className="welcome">No albums found.</p>}
        </div>
      </section>
    </div>
  );
}
