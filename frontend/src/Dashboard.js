import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";

export default function Dashboard() {
    const [albums, setAlbums] = useState([]);
    const [query, setQuery] = useState("");
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        fetch("http://localhost:5001/api/albums", { cache: "no-store" })
            .then((res) => res.json())
            .then((data) => setAlbums(data))
            .catch(console.error);
    }, []);

    const filtered = albums.filter((a) =>
        `${a.title} ${a.artist}`.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div style={{ padding: 24 }}>
            <h1>AlbumShelf</h1>
            <p>{user?.username ? `Welcome, ${user.username}` : "Welcome"}</p>
            <button
                onClick={() => {
                    logout();
                    navigate("/login");
                }}
            >
                Logout
            </button>
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title or artist"
            />
            <div style={{ marginTop: 12 }}>
                {filtered.map((a) => (
                    <div key={a._id}>
                        <b>{a.title}</b> - {a.artist}
                    </div>
                ))}
            </div>
        </div>
    );
}
