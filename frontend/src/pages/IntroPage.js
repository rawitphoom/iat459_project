import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function IntroPage() {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState([]);

  useEffect(() => {
    if (sessionStorage.getItem("hasEnteredSite") === "true") {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/home", { replace: true });
      }
    }
  }, [navigate]);

  // Fetch album covers for the background
  useEffect(() => {
    fetch("http://localhost:5001/api/music/chart")
      .then((r) => r.json())
      .then((data) => {
        const covers = (data?.albums || [])
          .map((a) => a.cover_big || a.cover_medium || a.cover)
          .filter(Boolean);
        setAlbums(covers);
      })
      .catch(() => {});
  }, []);

  function handleEnterSite() {
    sessionStorage.setItem("hasEnteredSite", "true");
    window.dispatchEvent(new Event("start-background-music"));
    navigate("/home", { replace: true });
  }

  // Build columns — duplicate covers so animation loops seamlessly
  const columnCount = Math.ceil(window.innerWidth / 160);
  const columns = [];
  for (let i = 0; i < columnCount; i++) {
    const offset = (i * 7) % Math.max(albums.length, 1);
    const shuffled = [...albums.slice(offset), ...albums.slice(0, offset)];
    // Double the list for seamless loop
    columns.push({ covers: [...shuffled, ...shuffled], direction: i % 2 === 0 ? "up" : "down" });
  }

  return (
    <div className="intro-page">
      {/* Album columns background */}
      {albums.length > 0 && (
        <div className="intro-albums-bg">
          {columns.map((col, i) => (
            <div
              key={i}
              className={`intro-album-col ${col.direction === "up" ? "scroll-up" : "scroll-down"}`}
            >
              {col.covers.map((cover, j) => (
                <div key={j} className="intro-album-tile">
                  <img src={cover} alt="" draggable={false} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Dark overlay for readability */}
      <div className="intro-overlay" />

      {/* Center content */}
      <div className="intro-card">
        <h1 className="intro-title">MIXTAPE</h1>
        <p className="intro-subtitle">Your music, your story.</p>
        <button className="intro-enter-btn" onClick={handleEnterSite}>
          Enter
        </button>
      </div>
    </div>
  );
}
