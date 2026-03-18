import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";

export default function Dashboard() {
    // User playlists pulled from the API
    const [playlists, setPlaylists] = useState([]);
    // Search input for filtering playlists
    const [query, setQuery] = useState("");
    // Form fields for creating a new playlist
    const [form, setForm] = useState({
        name: "",
        description: "",
        mood: "",
        tracks: "",
    });
    // Create form error message
    const [formError, setFormError] = useState("");
    // Disable submit while request is in flight
    const [isSaving, setIsSaving] = useState(false);
    // Auth state + helpers
    const { user, token, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        // Load current user's playlists on page load / token change
        fetch("http://localhost:5001/api/playlists", {
            cache: "no-store",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => res.json())
            .then((data) => setPlaylists(data))
            .catch(console.error);
    }, [token]);

    // Client-side search over playlist fields
    const filtered = playlists.filter((p) =>
        `${p.name} ${p.description} ${p.mood} ${p.tracks?.join(" ") || ""}`
            .toLowerCase()
            .includes(query.toLowerCase())
    );

    const handleCreate = async (e) => {
        e.preventDefault();
        setFormError("");

        // Basic validation
        if (!form.name.trim()) {
            setFormError("Playlist name is required.");
            return;
        }

        try {
            setIsSaving(true);
            // Create playlist for current user
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
                    tracks: form.tracks
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setFormError(data?.error || "Create failed");
                return;
            }

            // Add new playlist to the top of the list and reset form
            setPlaylists((prev) => [data, ...prev]);
            setForm({ name: "", description: "", mood: "", tracks: "" });
        } catch {
            setFormError("Server unavailable");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="app-shell">
            <header className="header-row">
                <div>
                    <h1 className="brand">Mixtape.</h1>
                    {/* Greet logged-in user if available */}
                    <p className="welcome">
                        {user?.username ? `Welcome, ${user.username}` : "Welcome"}
                    </p>
                </div>
                <button
                    className="ghost-btn"
                    // Logout then return to login screen
                    onClick={() => {
                        logout();
                        navigate("/login");
                    }}
                >
                    Logout
                </button>
            </header>

            <section className="card">
                {/* Create playlist form */}
                <h3>Create Playlist</h3>
                <form className="form-grid" onSubmit={handleCreate}>
                    <input
                        className="input"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Playlist name"
                    />
                    <input
                        className="input"
                        value={form.description}
                        onChange={(e) =>
                            setForm({ ...form, description: e.target.value })
                        }
                        placeholder="Description"
                    />
                    <input
                        className="input"
                        value={form.mood}
                        onChange={(e) => setForm({ ...form, mood: e.target.value })}
                        placeholder="Mood (optional)"
                    />
                    <input
                        className="input"
                        value={form.tracks}
                        onChange={(e) => setForm({ ...form, tracks: e.target.value })}
                        placeholder="Tracks (comma separated)"
                    />
                    <div className="form-actions">
                        <button className="primary-btn" type="submit" disabled={isSaving}>
                            {isSaving ? "Saving..." : "Create"}
                        </button>
                        {formError ? (
                            <p className="error-text">{formError}</p>
                        ) : null}
                    </div>
                </form>
            </section>

            <section className="card">
                {/* Search and list playlists */}
                <input
                    className="input search-input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search playlists"
                />
                <div className="playlist-list">
                    {filtered.map((p, idx) => (
                        <div
                            key={p._id}
                            className="playlist-item"
                            style={{ "--i": idx }}
                        >
                            <div className="playlist-title">{p.name}</div>
                            <div className="playlist-meta">
                                {p.mood ? <span>{p.mood}</span> : null}
                                {p.description ? <span>{p.description}</span> : null}
                                {p.tracks?.length ? (
                                    <span>{p.tracks.join(", ")}</span>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
