import { useContext, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
// Import the track search component for adding songs to playlists
import TrackSearch from "./TrackSearch";

export default function Dashboard() {
    // ---- State ----
    const [playlists, setPlaylists] = useState([]);
    const [query, setQuery] = useState("");
    const [form, setForm] = useState({ name: "", description: "", mood: "" });
    // Tracks selected from search — full track objects with previewUrl, albumArt, etc.
    const [selectedTracks, setSelectedTracks] = useState([]);
    const [formError, setFormError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    // Which track's preview is currently playing in the saved playlists section
    const [playingId, setPlayingId] = useState(null);
    // useRef holds the current Audio object so we can pause it
    const audioRef = useRef(null);
    const { user, token, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    // ---- Load playlists on mount ----
    useEffect(() => {
        fetch("http://localhost:5001/api/playlists", {
            cache: "no-store",
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => setPlaylists(data))
            .catch(console.error);
    }, [token]);

    // ---- Filter playlists by search query ----
    const filtered = playlists.filter((p) =>
        `${p.name} ${p.description} ${p.mood} ${p.tracks?.map((t) => `${t.name} ${t.artist}`).join(" ") || ""}`
            .toLowerCase()
            .includes(query.toLowerCase())
    );

    // ---- Track selection handlers ----
    const handleAddTrack = (track) => {
        if (selectedTracks.some((t) => t.trackId === track.trackId)) return;
        setSelectedTracks((prev) => [...prev, track]);
    };

    const handleRemoveTrack = (trackId) => {
        setSelectedTracks((prev) => prev.filter((t) => t.trackId !== trackId));
    };

    // ---- Create playlist handler ----
    const handleCreate = async (e) => {
        e.preventDefault();
        setFormError("");

        if (!form.name.trim()) {
            setFormError("Playlist name is required.");
            return;
        }
        if (selectedTracks.length === 0) {
            setFormError("Add at least one track.");
            return;
        }

        try {
            setIsSaving(true);
            const res = await fetch("http://localhost:5001/api/playlists", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: form.name.trim(),
                    description: form.description.trim(),
                    mood: form.mood.trim(),
                    tracks: selectedTracks,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setFormError(data?.error || "Create failed");
                return;
            }

            setPlaylists((prev) => [data, ...prev]);
            setForm({ name: "", description: "", mood: "" });
            setSelectedTracks([]);
        } catch {
            setFormError("Server unavailable");
        } finally {
            setIsSaving(false);
        }
    };

    // ---- Audio preview playback for saved playlist tracks ----
    // Click ▶ to play, click ⏸ to pause. Only one track plays at a time.
    const togglePreview = (track) => {
        if (!track.previewUrl) return;

        if (playingId === track.trackId) {
            audioRef.current?.pause();
            setPlayingId(null);
            return;
        }

        if (audioRef.current) {
            audioRef.current.pause();
        }

        const audio = new Audio(track.previewUrl);
        audio.volume = 0.5;
        audio.play();
        audio.onended = () => setPlayingId(null);
        audioRef.current = audio;
        setPlayingId(track.trackId);
    };

    // Convert seconds to "m:ss" format
    const formatDuration = (sec) => {
        const min = Math.floor(sec / 60);
        const s = sec % 60;
        return `${min}:${s.toString().padStart(2, "0")}`;
    };

    return (
        <div className="app-shell">
            {/* ---- Header ---- */}
            <header className="header-row">
                <div>
                    <h1 className="brand">Mixtape.</h1>
                    <p className="welcome">
                        {user?.username ? `Welcome, ${user.username}` : "Welcome"}
                    </p>
                </div>
                <button
                    className="ghost-btn"
                    onClick={() => { logout(); navigate("/login"); }}
                >
                    Logout
                </button>
            </header>

            {/* ---- Create Playlist Section ---- */}
            <section className="card">
                <h3>Create Playlist</h3>
                <form className="form-grid" onSubmit={handleCreate}>
                    <input className="input" value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Playlist name" />
                    <input className="input" value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Description" />
                    <input className="input" value={form.mood}
                        onChange={(e) => setForm({ ...form, mood: e.target.value })}
                        placeholder="Mood (optional)" />
                    <div className="form-actions">
                        <button className="primary-btn" type="submit" disabled={isSaving}>
                            {isSaving ? "Saving..." : "Create"}
                        </button>
                        {formError && <p className="error-text">{formError}</p>}
                    </div>
                </form>

                {/* Selected tracks preview — shows what will be in the playlist */}
                {selectedTracks.length > 0 && (
                    <div className="selected-tracks">
                        <h4>Tracks ({selectedTracks.length})</h4>
                        {selectedTracks.map((track) => (
                            <div key={track.trackId} className="selected-track">
                                {track.albumArt && (
                                    <img className="track-art-sm" src={track.albumArt} alt={track.album} />
                                )}
                                <span className="track-name-sm">
                                    {track.name} <span className="track-artist-sm">- {track.artist}</span>
                                </span>
                                <button className="icon-btn remove-btn"
                                    onClick={() => handleRemoveTrack(track.trackId)} title="Remove">
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Track search — search songs and click "+" to add */}
                <div style={{ marginTop: "12px" }}>
                    <h4>Add Tracks</h4>
                    <TrackSearch onAddTrack={handleAddTrack} selectedTracks={selectedTracks} />
                </div>
            </section>

            {/* ---- Saved Playlists Section ---- */}
            <section className="card">
                <h3>Your Playlists</h3>
                <input className="input search-input" value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search playlists" />

                <div className="playlist-list">
                    {filtered.map((p, idx) => (
                        <div key={p._id} className="playlist-item" style={{ "--i": idx }}>
                            <div className="playlist-title">{p.name}</div>
                            <div className="playlist-meta">
                                {p.mood ? <span>{p.mood}</span> : null}
                                {p.description ? <span>{p.description}</span> : null}
                            </div>

                            {/* Track list — each track has album art, info, and a play button */}
                            {p.tracks?.length > 0 && (
                                <div className="playlist-tracks">
                                    {p.tracks.map((track, i) => (
                                        <div key={track.trackId || i} className="track-row">
                                            {track.albumArt && (
                                                <img className="track-art-sm" src={track.albumArt} alt={track.album} />
                                            )}
                                            <div className="track-info">
                                                <div className="track-name">{track.name}</div>
                                                <div className="track-artist">
                                                    {track.artist}
                                                    {track.durationSec ? ` \u00B7 ${formatDuration(track.durationSec)}` : ""}
                                                </div>
                                            </div>
                                            <div className="track-actions">
                                                {/* Click to play/pause 30-second preview */}
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
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
