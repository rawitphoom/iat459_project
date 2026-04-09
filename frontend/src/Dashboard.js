import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";

// Extract dominant color from an image URL
function useDominantColor(imgUrl) {
    const [color, setColor] = useState(null);
    useEffect(() => {
        if (!imgUrl) return;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 50;
            canvas.height = 50;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, 50, 50);
            try {
                const data = ctx.getImageData(0, 0, 50, 50).data;
                let r = 0, g = 0, b = 0, count = 0;
                for (let i = 0; i < data.length; i += 16) {
                    const pr = data[i], pg = data[i + 1], pb = data[i + 2];
                    if (pr + pg + pb < 40 || pr + pg + pb > 700) continue;
                    r += pr; g += pg; b += pb; count++;
                }
                if (count > 0) {
                    r = Math.round(r / count);
                    g = Math.round(g / count);
                    b = Math.round(b / count);
                    const max = Math.max(r, g, b);
                    const factor = Math.min(255 / Math.max(max, 1), 1.4);
                    r = Math.min(255, Math.round(r * factor));
                    g = Math.min(255, Math.round(g * factor));
                    b = Math.min(255, Math.round(b * factor));
                    setColor(`${r}, ${g}, ${b}`);
                }
            } catch { /* CORS-tainted canvas */ }
        };
        img.src = imgUrl;
    }, [imgUrl]);
    return color;
}

function AlbumCard({ album, isActive, onEnter, onLeave, onView, token }) {
    const color = useDominantColor(album.coverXl || album.cover);
    const style = color ? { "--glow-color": color } : undefined;
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!token) return;
        fetch(`http://localhost:5001/api/favorites/albums/check/${album.id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((d) => setSaved(!!d.isFavorited))
            .catch(() => {});
    }, [album.id, token]);

    const toggleSave = async (e) => {
        e.stopPropagation();
        if (!token) {
            alert("Please log in to save albums.");
            return;
        }
        const wasSaved = saved;
        setSaved(!wasSaved);
        try {
            const res = wasSaved
                ? await fetch(`http://localhost:5001/api/favorites/albums/${album.id}`, {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${token}` },
                  })
                : await fetch("http://localhost:5001/api/favorites/albums", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify({
                          albumId: String(album.id),
                          title: album.title || "",
                          artist: album.artist || "",
                          cover: album.coverXl || album.cover || "",
                      }),
                  });
            if (!res.ok) {
                setSaved(wasSaved);
                if (res.status === 401 || res.status === 403) {
                    alert("Your session has expired. Please log in again.");
                }
            }
        } catch {
            setSaved(wasSaved);
        }
    };

    return (
        <div
            className={`dash-album-card ${isActive ? "is-active" : "is-dim"}`}
            style={style}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
        >
            <img src={album.coverXl || album.cover} alt={album.title} className="dash-album-art" crossOrigin="anonymous" />
            <div className="dash-album-title">{album.title?.toUpperCase()}</div>
            <div className="dash-album-artist">{album.artist}</div>
            <div className="dash-album-actions">
                <button className="dash-album-btn" onClick={(e) => { e.stopPropagation(); onView(); }}>
                    View Album ▶
                </button>
                <button className="dash-album-btn" onClick={toggleSave}>
                    {saved ? "Saved ♥" : "Save Album ♥"}
                </button>
            </div>
        </div>
    );
}

function MixtapeCard({ mix, isActive, onEnter, onLeave, onView }) {
    const arts = (mix.tracks || []).map(t => t.albumArt).filter(Boolean).slice(0, 4);
    while (arts.length < 4) arts.push(null);
    const color = useDominantColor(arts[0]);
    const style = color ? { "--glow-color": color } : undefined;
    const creator = mix.creator?.name || mix.creator?.username || "Unknown";
    return (
        <div
            className={`dash-album-card ${isActive ? "is-active" : "is-dim"}`}
            style={style}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
        >
            <div className="dash-mix-mosaic">
                {arts.map((art, j) => (
                    <div key={j} className="dash-mix-tile">
                        {art ? <img src={art} alt="" crossOrigin="anonymous" /> : <div className="dash-mix-empty">♪</div>}
                    </div>
                ))}
            </div>
            <div className="dash-album-title">{mix.name}</div>
            <div className="dash-album-artist">{creator}</div>
            <div className="dash-album-actions">
                <button className="dash-album-btn" onClick={(e) => { e.stopPropagation(); onView(); }}>
                    View Mixtape ▶
                </button>
            </div>
        </div>
    );
}

function StarRating({ rating }) {
    return (
        <div className="dash-review-stars">
            {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} className={s <= rating ? "star filled" : "star"}>★</span>
            ))}
        </div>
    );
}

export default function Dashboard() {
    const [albums, setAlbums] = useState([]);
    const [activeIdx, setActiveIdx] = useState(0);
    const [hoveredIdx, setHoveredIdx] = useState(-1);
    const [albumPaused, setAlbumPaused] = useState(false);
    const albumPauseTimerRef = useRef(null);
    const [trackOffset, setTrackOffset] = useState(0);
    const albumViewportRef = useRef(null);
    const [albumsLoading, setAlbumsLoading] = useState(true);
    const [mixtapes, setMixtapes] = useState([]);
    const [mixtapesLoading, setMixtapesLoading] = useState(true);
    const [activeMix, setActiveMix] = useState(0);
    const [hoveredMix, setHoveredMix] = useState(-1);
    const [mixPaused, setMixPaused] = useState(false);
    const mixPauseTimerRef = useRef(null);

    const pauseAlbumAutoplay = () => {
        setAlbumPaused(true);
        if (albumPauseTimerRef.current) clearTimeout(albumPauseTimerRef.current);
        albumPauseTimerRef.current = setTimeout(() => setAlbumPaused(false), 2000);
    };
    const pauseMixAutoplay = () => {
        setMixPaused(true);
        if (mixPauseTimerRef.current) clearTimeout(mixPauseTimerRef.current);
        mixPauseTimerRef.current = setTimeout(() => setMixPaused(false), 2000);
    };
    const [reviews, setReviews] = useState([]);
    const [reviewPage, setReviewPage] = useState(0);
    const { user, token } = useContext(AuthContext);
    const navigate = useNavigate();

    const effectiveIdx = hoveredIdx >= 0 ? hoveredIdx : activeIdx;

    const mixPerPage = 4;
    const totalMixPages = Math.ceil(mixtapes.length / mixPerPage);
    const [mixPage, setMixPage] = useState(0);
    const visibleMixtapes = mixtapes.slice(mixPage * mixPerPage, mixPage * mixPerPage + mixPerPage);
    const effectiveMixIdx = hoveredMix >= 0 ? hoveredMix : activeMix;

    const reviewsPerPage = 3;
    const visibleReviews = reviews.slice(0, reviewsPerPage * (reviewPage + 1));
    const hasMore = visibleReviews.length < reviews.length;

    // Load latest albums from chart
    useEffect(() => {
        fetch("http://localhost:5001/api/music/chart")
            .then((res) => res.json())
            .then((data) => {
                const list = (data?.albums || []).slice(0, 8);
                setAlbums(list);
            })
            .catch(console.error)
            .finally(() => setAlbumsLoading(false));
    }, []);

    // Load public mixtapes
    useEffect(() => {
        fetch("http://localhost:5001/api/playlists/public")
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) setMixtapes(data.slice(0, 8));
            })
            .catch(() => {})
            .finally(() => setMixtapesLoading(false));
    }, []);

    // Autoplay light-up cycle for albums (3s), pauses on hover or after user clicks an arrow
    useEffect(() => {
        if (albums.length === 0) return;
        if (hoveredIdx >= 0 || albumPaused) return;
        const id = setInterval(() => {
            setActiveIdx((i) => (i + 1) % albums.length);
        }, 3000);
        return () => clearInterval(id);
    }, [albums.length, hoveredIdx, albumPaused]);

// Smooth-scroll page: only advances when active crosses a 4-card boundary
    useEffect(() => {
        if (!albumViewportRef.current || albums.length === 0) return;
        const perPage = 4;
        const compute = () => {
            const vp = albumViewportRef.current;
            if (!vp) return;
            const card = vp.querySelector(".dash-album-card");
            if (!card) return;
            const cardW = card.offsetWidth;
            const styles = getComputedStyle(vp.querySelector(".dash-album-track"));
            const gap = parseFloat(styles.columnGap || styles.gap || "24") || 24;
            const slot = cardW + gap;
            const page = Math.floor(effectiveIdx / perPage);
            setTrackOffset(-slot * perPage * page);
        };
        compute();
        window.addEventListener("resize", compute);
        return () => window.removeEventListener("resize", compute);
    }, [effectiveIdx, albums.length]);

    // Autoplay light-up cycle for mixtapes
    useEffect(() => {
        if (mixtapes.length === 0) return;
        if (hoveredMix >= 0 || mixPaused) return;
        const id = setInterval(() => {
            setActiveMix((i) => (i + 1) % mixtapes.length);
        }, 3000);
        return () => clearInterval(id);
    }, [mixtapes.length, hoveredMix, mixPaused]);

    useEffect(() => {
        if (mixtapes.length === 0) return;
        const target = Math.floor(activeMix / mixPerPage);
        if (target !== mixPage) setMixPage(target);
    }, [activeMix, mixtapes.length]); // eslint-disable-line

    // Load recent reviews and fetch missing album art
    useEffect(() => {
        fetch("http://localhost:5001/api/reviews/recent?limit=12")
            .then((res) => res.json())
            .then(async (data) => {
                if (!Array.isArray(data)) return;
                const updated = await Promise.all(
                    data.map(async (r) => {
                        if (r.albumArt || !r.albumId) return r;
                        try {
                            const res = await fetch(`http://localhost:5001/api/music/album/${r.albumId}`);
                            const album = await res.json();
                            return { ...r, albumArt: album.coverXl || album.cover || "" };
                        } catch { return r; }
                    })
                );
                setReviews(updated);
            })
            .catch(() => {});
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
                        WELCOME BACK {user?.name || user?.username || ""}!
                    </h1>
                    <p className="dash-subtitle">
                        Create mixtapes and share your thoughts on your favorite albums and songs.
                    </p>
                    <div className="dash-hero-actions">
                        <button className="dash-action-btn" onClick={() => navigate("/create-mixtape")}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                            CREATE NEW MIXTAPE
                        </button>
                        <button className="dash-action-btn" onClick={() => navigate("/write-review")}>
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
                    <div className="dash-section-controls">
                        <div className="dash-album-nav">
                            {albums.map((_, i) => (
                                <span
                                    key={i}
                                    className={`dash-album-dot ${i === effectiveIdx ? "active" : ""}`}
                                >
                                    ♪
                                </span>
                            ))}
                        </div>
                        <div className="dash-nav-buttons">
                            <button
                                className="dash-nav-btn"
                                aria-label="Previous"
                                onClick={() => { pauseAlbumAutoplay(); setActiveIdx((i) => (i > 0 ? i - 1 : albums.length - 1)); }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                            </button>
                            <button
                                className="dash-nav-btn"
                                aria-label="Next"
                                onClick={() => { pauseAlbumAutoplay(); setActiveIdx((i) => (i < albums.length - 1 ? i + 1 : 0)); }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </button>
                        </div>
                    </div>
                </div>

                {albumsLoading ? (
                    <div className="discover-loader">
                        <span className="discover-loader-dot" />
                        <span className="discover-loader-dot" />
                        <span className="discover-loader-dot" />
                    </div>
                ) : (
                <div className="dash-album-row">
                    <div className="dash-album-viewport" ref={albumViewportRef}>
                        <div
                            className="dash-album-track"
                            style={{ transform: `translateX(${trackOffset}px)` }}
                        >
                            {albums.map((album, globalIdx) => (
                                <AlbumCard
                                    key={album.id}
                                    album={album}
                                    isActive={globalIdx === effectiveIdx}
                                    onEnter={() => setHoveredIdx(globalIdx)}
                                    onLeave={() => setHoveredIdx(-1)}
                                    onView={() => navigate(`/album/${album.id}`)}
                                    token={token}
                                />
                            ))}
                        </div>
                    </div>

                </div>
                )}
            </section>

            {/* ---- Popular Mixtapes ---- */}
            {(mixtapesLoading || mixtapes.length > 0) && (
                <section className="dash-section">
                    <div className="dash-section-header">
                        <div>
                            <h2 className="dash-section-title">POPULAR MIXTAPES</h2>
                            <p className="dash-section-sub">Check out the weekly release for some new tunes.</p>
                        </div>
                        <div className="dash-section-controls">
                            <div className="dash-album-nav">
                                {mixtapes.map((_, i) => (
                                    <span
                                        key={i}
                                        className={`dash-album-dot ${i === effectiveMixIdx ? "active" : ""}`}
                                    >
                                        ♪
                                    </span>
                                ))}
                            </div>
                            <div className="dash-nav-buttons">
                                <button
                                    className="dash-nav-btn"
                                    aria-label="Previous"
                                    onClick={() => { pauseMixAutoplay(); setActiveMix((i) => (i > 0 ? i - 1 : mixtapes.length - 1)); }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                                </button>
                                <button
                                    className="dash-nav-btn"
                                    aria-label="Next"
                                    onClick={() => { pauseMixAutoplay(); setActiveMix((i) => (i < mixtapes.length - 1 ? i + 1 : 0)); }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {mixtapesLoading ? (
                        <div className="discover-loader">
                            <span className="discover-loader-dot" />
                            <span className="discover-loader-dot" />
                            <span className="discover-loader-dot" />
                        </div>
                    ) : (
                    <div className="dash-album-row">
                        <div className="dash-album-grid">
                            {visibleMixtapes.map((mix, i) => {
                                const globalIdx = mixPage * mixPerPage + i;
                                return (
                                    <MixtapeCard
                                        key={mix._id}
                                        mix={mix}
                                        isActive={globalIdx === effectiveMixIdx}
                                        onEnter={() => setHoveredMix(globalIdx)}
                                        onLeave={() => setHoveredMix(-1)}
                                        onView={() => navigate(`/playlist/${mix._id}`)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                    )}
                </section>
            )}

            {/* ---- Popular Reviews This Week ---- */}
            {reviews.length > 0 && (
                <section className="dash-section">
                    <div className="dash-section-header">
                        <div>
                            <h2 className="dash-section-title">POPULAR REVIEWS THIS WEEK</h2>
                            <p className="dash-section-sub">Check out the weekly release for some new tunes.</p>
                        </div>
                    </div>

                    <div className="dash-reviews-list">
                        {visibleReviews.map((review) => (
                            <div
                                key={review._id}
                                className="dash-review-card"
                                onClick={() => navigate(`/album/${review.albumId}`)}
                            >
                                {/* Left: text content */}
                                <div className="dash-review-body">
                                    <div className="dash-review-album-title">
                                        {review.albumTitle || "Unknown Album"}
                                    </div>
                                    <StarRating rating={review.rating} />
                                    <div className="dash-review-user">
                                        <img
                                            src={`https://api.dicebear.com/7.x/big-smile/svg?seed=${review.username}`}
                                            alt={review.username}
                                            className="dash-review-avatar"
                                        />
                                        <span>{review.username}</span>
                                    </div>
                                    {review.title && (
                                        <div className="dash-review-headline">{review.title}</div>
                                    )}
                                    {review.text && (
                                        <p className="dash-review-text">{review.text}</p>
                                    )}
                                </div>

                                {/* Right: album art + vinyl */}
                                <div className="dash-review-cover">
                                    <img
                                        src={process.env.PUBLIC_URL + "/review-vinyl.svg"}
                                        alt=""
                                        className="dash-review-vinyl"
                                    />
                                    {review.albumArt && (
                                        <img
                                            src={review.albumArt}
                                            alt={review.albumTitle}
                                            className="dash-review-art"
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {hasMore && (
                        <div className="dash-reviews-more">
                            <button
                                className="dash-load-more-btn"
                                onClick={() => setReviewPage((p) => p + 1)}
                            >
                                Load more...
                            </button>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
