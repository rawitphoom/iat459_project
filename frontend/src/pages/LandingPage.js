import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

// Static album data for the 3D ring
const ALBUMS = [
  { id: 6575789, title: "In Rainbows", cover: "https://cdn-images.dzcdn.net/images/cover/311bba0fc112d15f72c8b5a65f0456c1/500x500-000000-80-0-0.jpg" },
  { id: 6032550, title: "Channel Orange", cover: "https://cdn-images.dzcdn.net/images/cover/951c831f76dac672dc9e7ea1c8bb6e7d/500x500-000000-80-0-0.jpg" },
  { id: 1527551, title: "The Life of Pablo", cover: "https://cdn-images.dzcdn.net/images/cover/b9ea1cd9997b0373d05bfbb6d3cbb111/500x500-000000-80-0-0.jpg" },
  { id: 86286, title: "Issues", cover: "https://cdn-images.dzcdn.net/images/cover/556212f5b16ffd34de4df816635e40fc/500x500-000000-80-0-0.jpg" },
  { id: 103248, title: "Flower Boy", cover: "https://cdn-images.dzcdn.net/images/cover/ec3c8ed67427064c70f67e5815b74cef/500x500-000000-80-0-0.jpg" },
  { id: 11483918, title: "Blonde", cover: "https://cdn-images.dzcdn.net/images/cover/cc8c4d579339b57051b6cf1c9fe1944d/500x500-000000-80-0-0.jpg" },
  { id: 75621062, title: "DAMN.", cover: "https://cdn-images.dzcdn.net/images/cover/8b8fc5d117f9357b79f0a0a410a170e8/500x500-000000-80-0-0.jpg" },
  { id: 1109731, title: "Discovery", cover: "https://cdn-images.dzcdn.net/images/cover/4a1f40fe1ef2d6244ed9fc094cb4fa35/500x500-000000-80-0-0.jpg" },
  { id: 13529009, title: "Random Access Memories", cover: "https://cdn-images.dzcdn.net/images/cover/4ee76930f419959acb2fcafce894ea71/500x500-000000-80-0-0.jpg" },
  { id: 7103854, title: "good kid, m.A.A.d city", cover: "https://cdn-images.dzcdn.net/images/cover/e1151fb1cd2be03bc859618515f44327/500x500-000000-80-0-0.jpg" },
  { id: 302127, title: "OK Computer", cover: "https://cdn-images.dzcdn.net/images/cover/5718f7c81c27e0b2417e2a4c45224f8a/500x500-000000-80-0-0.jpg" },
  { id: 1016399, title: "Currents", cover: "https://cdn-images.dzcdn.net/images/cover/4b06ec4a3f725ebe065a9bbcc61d0483/500x500-000000-80-0-0.jpg" },
];

const FEATURES = [
  { icon: "♪", text: "Collect music into lists, rank an artist's discography, and more." },
  { icon: "♪", text: "Keep track of all the music you have listened to." },
  { icon: "♪", text: "Stay up to date as new albums are being released." },
  { icon: "♪", text: "Write reviews and rate music to share your opinions with friends and our community." },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const revealRefs = useRef([]);
  const [newReleases, setNewReleases] = useState([]);
  const [mixtapes, setMixtapes] = useState([]);
  const scrollRef = useRef(null);
  const releasesLeftRef = useRef(null);
  const releasesScrollRef = useRef(null);

  const count = ALBUMS.length;
  const angleStep = 360 / count;
  const radius = 460;

  // Fetch new releases from Deezer chart + public playlists
  useEffect(() => {
    fetch("http://localhost:5001/api/music/chart")
      .then((r) => r.json())
      .then((data) => {
        if (data.albums) setNewReleases(data.albums.slice(0, 20));
      })
      .catch(() => {});

    fetch("http://localhost:5001/api/playlists/public")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMixtapes(data.slice(0, 10));
      })
      .catch(() => {});
  }, []);

  // Scale down + fade the "NEW RELEASES" text as user scrolls horizontally
  useEffect(() => {
    const scrollEl = releasesScrollRef.current;
    const textEl = releasesLeftRef.current;
    if (!scrollEl || !textEl) return;

    const handleScroll = () => {
      const scrolled = scrollEl.scrollLeft;
      const fadeDistance = 120; // px of scroll to fully disappear
      const progress = Math.min(scrolled / fadeDistance, 1);
      const scale = 1 - progress * 0.6; // scale from 1 → 0.4
      const opacity = 1 - progress;
      textEl.style.transform = `translateY(-50%) scale(${scale})`;
      textEl.style.opacity = opacity;
    };

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [newReleases]);

  // Intersection Observer for scroll-reveal animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
          } else {
            entry.target.classList.remove("revealed");
          }
        });
      },
      { threshold: 0.15 }
    );

    revealRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [newReleases, mixtapes]);

  const addRef = (el) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  };

  // Horizontal scroll with drag
  const handleScrollLeft = (ref) => {
    if (ref.current) ref.current.scrollBy({ left: -600, behavior: "smooth" });
  };
  const handleScrollRight = (ref) => {
    if (ref.current) ref.current.scrollBy({ left: 600, behavior: "smooth" });
  };

  return (
    <div className="landing-page">
      {/* ======== HERO: Ring + Title ======== */}
      <div className="landing">
        <div className="landing-ring-wrapper">
          <div className="landing-ring">
            {ALBUMS.map((album, i) => (
              <div
                key={album.id}
                className="landing-ring-item"
                style={{
                  transform: `rotateY(${i * angleStep}deg) translateZ(${radius}px)`,
                }}
                onClick={() => navigate(`/album/${album.id}`)}
              >
                <img src={album.cover} alt={album.title} />
              </div>
            ))}
          </div>
        </div>

        <div className="landing-bottom">
          <h1 className="landing-main-title">MIXTAPE</h1>
          <p className="landing-tagline">
            Discover new music and revisit favorites.<br />
            Build a collection that feels truly yours.
          </p>
          <button
            className="landing-cta"
            onClick={() => navigate("/register")}
          >
            GET STARTED ↗
          </button>
        </div>
      </div>

      {/* ======== FEATURES: "Mixtape lets you..." ======== */}
      <div className="landing-features">
        <h2 className="landing-features-title reveal-up" ref={addRef}>
          MIXTAPE<br />LETS YOU<span className="landing-dot">...</span>
        </h2>
        <div className="landing-features-grid">
          {FEATURES.map((feat, i) => (
            <div
              key={i}
              className="landing-feature-card reveal-up"
              ref={addRef}
              style={{ transitionDelay: `${i * 0.12}s` }}
            >
              <span className="landing-feature-icon">{feat.icon}</span>
              <p className="landing-feature-text">{feat.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ======== NEW RELEASES — floating layout ======== */}
      {newReleases.length > 0 && (
        <div className="landing-releases">
          <div className="landing-releases-left reveal-up" ref={(el) => { addRef(el); releasesLeftRef.current = el; }}>
            <h2 className="landing-releases-label">NEW RELEASES</h2>
            <p className="landing-releases-desc">
              Fresh albums dropping this week.<br />
              Scroll to explore what's new.
            </p>
            <button
              className="landing-section-link"
              onClick={() => navigate("/discover")}
            >
              View All →
            </button>
          </div>
          <div className="landing-releases-scroll" ref={releasesScrollRef}>
            <div className="landing-releases-track">
              {newReleases.map((album, i) => {
                const offsets = [0, -30, 15, -45, 8, -20, 35, -10, 25, -40, 12, -35, 30, -15, 5, -25, 20, -8, 38, -42];
                return (
                  <div
                    key={album.id}
                    className="landing-releases-card"
                    style={{
                      transform: `translateY(${offsets[i % offsets.length]}px)`,
                    }}
                    onClick={() => navigate(`/album/${album.id}`)}
                  >
                    <img src={album.cover} alt={album.title} />
                    <div className="landing-releases-info">
                      <div className="landing-releases-name">{album.title}</div>
                      <div className="landing-releases-artist">{album.artist}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======== POPULAR MIXTAPES ======== */}
      {mixtapes.length > 0 && (
        <div className="landing-top3">
          <h2 className="landing-top3-title reveal-up" ref={addRef}>
            Popular Mixtapes.
          </h2>
          <div className="landing-top3-grid">
            {mixtapes.slice(0, 3).map((mix, i) => (
              <div
                key={mix._id}
                className="landing-top3-card reveal-up"
                ref={addRef}
                style={{ transitionDelay: `${i * 0.15}s` }}
              >
                <div className="landing-top3-cover">
                  {mix.tracks?.slice(0, 4).map((t, j) => (
                    <img
                      key={j}
                      src={t.albumArt}
                      alt=""
                      className="landing-top3-thumb"
                    />
                  ))}
                  {(!mix.tracks || mix.tracks.length === 0) && (
                    <div className="landing-top3-empty">♪</div>
                  )}
                </div>
                <div className="landing-top3-label">
                  {mix.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
