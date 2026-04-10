import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../config";

/*
 * IntroPage — full-screen entry gate into the site.
 * Route: /
 *
 * The intro uses scrolling album-cover columns as a moving backdrop, then
 * hands the user off to /home once they click Enter. A session flag prevents
 * the splash from showing on every in-app navigation.
 */
export default function IntroPage() {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState([]);

  // If the user already entered the site during this browser session, skip the splash.
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
    fetch(`${API_URL}/api/music/chart`)
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
    // Mark the intro as completed and trigger the landing page's background music hook.
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
      {/* Moving cover-wall background: purely atmospheric and only rendered when covers are loaded. */}
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

      {/* Center card: the actual entry point for the experience. */}
      <div className="intro-card">
        <h1 className="intro-title">MIXTAPE</h1>
        <button className="intro-enter-btn" onClick={handleEnterSite}>
          Enter
        </button>
      </div>
    </div>
  );
}
