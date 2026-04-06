import { useContext, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import TrackSearch from "./TrackSearch";

export default function Dashboard() {
    const [playlists, setPlaylists] = useState([]);
    const [query, setQuery] = useState("");
    const [form, setForm] = useState({ name: "", description: "", mood: "", public: false });
    const [selectedTracks, setSelectedTracks] = useState([]);
    const [formError, setFormError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [playingId, setPlayingId] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const audioRef = useRef(null);
    const { user, token, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    // Stop audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    // Load playlists
    useEffect(() => {
        fetch("http://localhost:5001/api/playlists", {
            cache: "no-store",
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => setPlaylists(Array.isArray(data) ? data : []))
            .catch(console.error);
    }, [token]);

    const filtered = playlists.filter((p) =>
        `${p.name} ${p.description} ${p.mood} ${p.tracks?.map((t) => `${t.name} ${t.artist}`).join(" ") || ""}`
            .toLowerCase()
            .includes(query.toLowerCase())
    );

    const handleAddTrack = (track) => {
        if (selectedTracks.some((t) => t.trackId === track.trackId)) return;
        setSelectedTracks((prev) => [...prev, track]);
    };

    const handleRemoveTrack = (trackId) => {
        setSelectedTracks((prev) => prev.filter((t) => t.trackId !== trackId));
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setFormError("");
        if (!form.name.trim()) { setFormError("Playlist name is required."); return; }
        if (selectedTracks.length === 0) { setFormError("Add at least one track."); return; }

        try {
            setIsSaving(true);
            const res = await fetch("http://localhost:5001/api/playlists", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name: form.name.trim(),
                    description: form.description.trim(),
                    mood: form.mood.trim(),
                    tracks: selectedTracks,
                    public: form.public,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setFormError(data?.error || "Create failed"); return; }
            setPlaylists((prev) => [data, ...prev]);
            setForm({ name: "", description: "", mood: "", public: false });
            setSelectedTracks([]);
            setShowCreate(false);
        } catch {
            setFormError("Server unavailable");
        } finally {
            setIsSaving(false);
        }
    };

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
                        <button className="dash-action-btn" onClick={() => setShowCreate(true)}>
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

            {/* ---- Create Mixtape Modal ---- */}
            {showCreate && (
                <div className="dash-modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="dash-modal-close" onClick={() => setShowCreate(false)}>&times;</button>
                        <h2 className="dash-modal-title">Create New Mixtape</h2>
                        <form className="dash-form" onSubmit={handleCreate}>
                            <input className="dash-input" value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="Mixtape name" />
                            <input className="dash-input" value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Description" />
                            <input className="dash-input" value={form.mood}
                                onChange={(e) => setForm({ ...form, mood: e.target.value })}
                                placeholder="Mood (optional)" />
                            <label className="dash-toggle">
                                <input type="checkbox" checked={form.public}
                                    onChange={(e) => setForm({ ...form, public: e.target.checked })} />
                                Make public
                            </label>

                            {selectedTracks.length > 0 && (
                                <div className="dash-selected-tracks">
                                    <h4>Tracks ({selectedTracks.length})</h4>
                                    {selectedTracks.map((track) => (
                                        <div key={track.trackId} className="dash-sel-track">
                                            {track.albumArt && <img src={track.albumArt} alt="" className="dash-sel-art" />}
                                            <span className="dash-sel-name">{track.name} <span style={{ opacity: 0.5 }}>- {track.artist}</span></span>
                                            <button className="dash-sel-remove" onClick={() => handleRemoveTrack(track.trackId)}>&times;</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ marginTop: 12 }}>
                                <h4 style={{ color: "#fff", marginBottom: 8 }}>Add Tracks</h4>
                                <TrackSearch onAddTrack={handleAddTrack} selectedTracks={selectedTracks} />
                            </div>

                            <button className="dash-create-btn" type="submit" disabled={isSaving}>
                                {isSaving ? "Saving..." : "Create Mixtape"}
                            </button>
                            {formError && <p className="dash-error">{formError}</p>}
                        </form>
                    </div>
                </div>
            )}

            {/* ---- Your Mixtapes Section ---- */}
            <section className="dash-section">
                <div className="dash-section-header">
                    <h2 className="dash-section-title">YOUR MIXTAPES</h2>
                    <input className="dash-search" value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search your mixtapes..." />
                </div>

                {filtered.length === 0 && (
                    <p className="dash-empty">No mixtapes yet. Create your first one!</p>
                )}

                <div className="dash-playlist-grid">
                    {filtered.map((p) => (
                        <div key={p._id} className="dash-playlist-card">
                            {/* Mosaic cover */}
                            <div className="dash-playlist-cover">
                                {p.tracks?.slice(0, 4).map((t, j) => (
                                    t.albumArt ? <img key={j} src={t.albumArt} alt="" /> : <div key={j} className="dash-cover-empty" />
                                ))}
                                {(!p.tracks || p.tracks.length === 0) && <div className="dash-cover-placeholder">♪</div>}
                            </div>
                            <div className="dash-playlist-info">
                                <div className="dash-playlist-name">{p.name}</div>
                                {p.mood && <div className="dash-playlist-mood">{p.mood}</div>}
                                <div className="dash-playlist-count">{p.tracks?.length || 0} tracks</div>
                            </div>
                            {/* Track list */}
                            {p.tracks?.length > 0 && (
                                <div className="dash-tracks">
                                    {p.tracks.map((track, i) => (
                                        <div key={track.trackId || i} className="dash-track-row">
                                            {track.albumArt && <img className="dash-track-art" src={track.albumArt} alt="" />}
                                            <div className="dash-track-info">
                                                <div className="dash-track-name">{track.name}</div>
                                                <div className="dash-track-artist">
                                                    {track.artist}
                                                    {track.durationSec ? ` · ${formatDuration(track.durationSec)}` : ""}
                                                </div>
                                            </div>
                                            <button
                                                className={`dash-play-btn ${playingId === track.trackId ? "playing" : ""}`}
                                                onClick={() => togglePreview(track)}
                                            >
                                                {playingId === track.trackId ? "⏸" : "▶"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
