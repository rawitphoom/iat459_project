import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";

export default function Dashboard() {
    const [albums, setAlbums] = useState([]);
    const [page, setPage] = useState(0);
    const [hoveredIdx, setHoveredIdx] = useState(-1);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const perPage = 4;
    const totalPages = Math.ceil(albums.length / perPage);
    const visible = albums.slice(page * perPage, page * perPage + perPage);

    // Load latest albums from chart (limit to 8)
    useEffect(() => {
        fetch("http://localhost:5001/api/music/chart")
            .then((res) => res.json())
            .then((data) => {
                const list = (data?.albums || []).slice(0, 8);
                setAlbums(list);
            })
            .catch(console.error);
    }, []);

    return (
        <div className="dash-page">
            {/* ---- Hero with vinyl ---- */}
            <div className="dash-hero">
                <div className="dash-vinyl-wrapper">
                    <img
                        src={process.env.PUBLIC_URL + "/vinyl-glow.svg"}
                        alt=""
                        className="dash-vinyl-glow"
                    />
                    <img
                        src={process.env.PUBLIC_URL + "/vinyl.svg"}
                        alt=""
                        className="dash-vinyl"
                    />
                </div>
                <div className="dash-hero-content">
                    <h1 className="dash-welcome">
                        WELCOME BACK {user?.username || ""}!
                    </h1>
                    <p className="dash-subtitle">
                        Create mixtapes and share your thoughts on your favorite albums and songs.
                    </p>
                    <div className="dash-hero-actions">
                        <button className="dash-action-btn" onClick={() => navigate("/create-mixtape")}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                            CREATE NEW MIXTAPE
                        </button>
                        <button className="dash-action-btn" onClick={() => navigate("/discover")}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            WRITE A REVIEW
                        </button>
                    </div>
                </div>
            </div>

            {/* ---- Latest Albums Released ---- */}
            <section className="dash-section">
                <div className="dash-section-header">
                    <div>
                        <h2 className="dash-section-title">LATEST ALBUMS RELEASED</h2>
                        <p className="dash-section-sub">Check out the weekly release for some new tunes.</p>
                    </div>
                    <div className="dash-album-nav">
                        {albums.map((_, i) => (
                            <span
                                key={i}
                                className={`dash-album-dot ${i === hoveredIdx ? "active" : ""}`}
                            >
                                ♪
                            </span>
                        ))}
                    </div>
                </div>

                <div className="dash-album-row">
                    <button
                        className="dash-carousel-arrow left"
                        onClick={() => setPage((p) => (p > 0 ? p - 1 : totalPages - 1))}
                    >
                        ‹
                    </button>

                    <div className="dash-album-grid">
                        {visible.map((album, i) => (
                            <div
                                key={album.id}
                                className="dash-album-card"
                                onClick={() => navigate(`/album/${album.id}`)}
                                onMouseEnter={() => setHoveredIdx(page * perPage + i)}
                                onMouseLeave={() => setHoveredIdx(-1)}
                            >
                                <img
                                    src={album.coverXl || album.cover}
                                    alt={album.title}
                                    className="dash-album-art"
                                />
                                <div className="dash-album-title">{album.title?.toUpperCase()}</div>
                                <div className="dash-album-artist">{album.artist}</div>
                            </div>
                        ))}
                    </div>

                    <button
                        className="dash-carousel-arrow right"
                        onClick={() => setPage((p) => (p < totalPages - 1 ? p + 1 : 0))}
                    >
                        ›
                    </button>
                </div>
            </section>
        </div>
    );
}
