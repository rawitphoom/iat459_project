import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import API_URL from "../config";
import { SignInPopup } from "./AlbumDetail";

// Cycling mosaic cover — outgoing set slides out, incoming set slides in, both visible during transition
function CyclingMosaic({ tracks }) {
  const allArts = (tracks || []).map((t) => t.albumArt).filter(Boolean);
  const [currentSet, setCurrentSet] = useState(0);
  const [nextSet, setNextSet] = useState(null); // null = not transitioning

  const totalSets = Math.ceil(allArts.length / 4);

  useEffect(() => {
    if (allArts.length <= 4) return;

    const interval = setInterval(() => {
      const next = (currentSet + 1) % totalSets;
      setNextSet(next);

      // After both animations finish, commit the swap
      setTimeout(() => {
        setCurrentSet(next);
        setNextSet(null);
      }, 800);
    }, 3500);

    return () => clearInterval(interval);
  }, [allArts.length, totalSets, currentSet]);

  if (allArts.length === 0) {
    return (
      <div className="landing-top3-cover">
        <div className="landing-top3-empty">♪</div>
      </div>
    );
  }

  const getArts = (idx) => {
    const arts = [];
    for (let j = 0; j < 4; j++) {
      arts.push(allArts[(idx * 4 + j) % allArts.length]);
    }
    return arts;
  };

  const currentArts = getArts(currentSet);
  const nextArts = nextSet !== null ? getArts(nextSet) : null;

  return (
    <div className="landing-top3-cover">
      {/* Current set — slides out when nextSet appears */}
      {currentArts.map((art, j) => (
        <img
          key={`cur-${currentSet}-${j}`}
          src={art}
          alt=""
          className={`landing-top3-thumb corner-${j} ${nextSet !== null ? "slide-out" : ""}`}
          style={{ gridColumn: (j % 2) + 1, gridRow: Math.floor(j / 2) + 1, zIndex: 1 }}
        />
      ))}
      {/* Next set — slides in on top */}
      {nextArts && nextArts.map((art, j) => (
        <img
          key={`next-${nextSet}-${j}`}
          src={art}
          alt=""
          className={`landing-top3-thumb corner-${j} slide-in`}
          style={{ gridColumn: (j % 2) + 1, gridRow: Math.floor(j / 2) + 1, zIndex: 2 }}
        />
      ))}
    </div>
  );
}

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
  { icon: "♪", text: "Keep track of all the music you have listened to." },
  { icon: "♪", text: "Collect music into lists, rank an artist's discography, and more." },
  { icon: "♪", text: "Stay up to date as new albums are being released." },
  { icon: "♪", text: "Write reviews and rate music to share your opinions with friends and our community." },
];

// Real-time equalizer using Web Audio API AnalyserNode
const EQ_COLUMNS = 60;
const EQ_SEGMENTS = 20;
const MAX_HEIGHT = 100;

function EqualizerBars({ analyser, playing, color }) {
  const segRefs = useRef([]); // 2D array: segRefs[col][seg]
  const rafRef = useRef(null);
  const barColor = color || "rgba(255,255,255,0.85)";

  useEffect(() => {
    if (!analyser || !playing) {
      // Reset: show only bottom 1 segment
      segRefs.current.forEach((col) => {
        if (!col) return;
        col.forEach((seg, j) => {
          if (seg) seg.style.opacity = j === 0 ? "1" : "0";
        });
      });
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    // Smoothed values per column — segments fall slowly, rise instantly
    const smoothed = new Float32Array(EQ_COLUMNS);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);

      const usableBins = Math.floor(bufferLength * 0.65);
      const step = usableBins / EQ_COLUMNS;

      for (let i = 0; i < EQ_COLUMNS; i++) {
        const colSegs = segRefs.current[i];
        if (!colSegs) continue;

        const lowBin = Math.floor(i * step);
        const highBin = Math.floor((i + 1) * step);

        let sum = 0;
        let count = 0;
        for (let j = lowBin; j < highBin && j < bufferLength; j++) {
          sum += dataArray[j];
          count++;
        }
        const avg = count > 0 ? sum / count : 0;
        const target = Math.pow(avg / 255, 0.75) * EQ_SEGMENTS;

        // Rise instantly, fall slowly
        if (target >= smoothed[i]) {
          smoothed[i] = target;
        } else {
          smoothed[i] = smoothed[i] * 0.85 + target * 0.15;
        }

        const activeCount = Math.max(1, Math.round(smoothed[i]));

        for (let s = 0; s < EQ_SEGMENTS; s++) {
          if (colSegs[s]) {
            colSegs[s].style.opacity = s < activeCount ? "1" : "0";
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, playing]);

  return (
    <div className="explore-eq">
      {Array.from({ length: EQ_COLUMNS }).map((_, i) => (
        <div key={i} className="eq-col">
          {Array.from({ length: EQ_SEGMENTS }).map((_, j) => (
            <div
              key={j}
              className="eq-seg"
              ref={(el) => {
                if (!segRefs.current[i]) segRefs.current[i] = [];
                segRefs.current[i][j] = el;
              }}
              style={{ background: barColor, opacity: j === 0 ? 1 : 0 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

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
      const data = ctx.getImageData(0, 0, 50, 50).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 16) {
        const pr = data[i], pg = data[i + 1], pb = data[i + 2];
        // Skip very dark and very light pixels
        if (pr + pg + pb < 40 || pr + pg + pb > 700) continue;
        r += pr; g += pg; b += pb; count++;
      }
      if (count > 0) {
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        // Boost saturation a bit
        const max = Math.max(r, g, b);
        const factor = Math.min(255 / max, 1.4);
        r = Math.min(255, Math.round(r * factor));
        g = Math.min(255, Math.round(g * factor));
        b = Math.min(255, Math.round(b * factor));
        setColor(`rgb(${r}, ${g}, ${b})`);
      }
    };
    img.src = imgUrl;
  }, [imgUrl]);
  return color;
}

// 3D perspective carousel for Explore Your Taste
function ExploreCarousel({ navigate, token }) {
  const [tracks, setTracks] = useState([]);
  const [center, setCenter] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [tiltClass, setTiltClass] = useState("");
  const [likedTracks, setLikedTracks] = useState(new Set());
  const [authOpen, setAuthOpen] = useState(false);
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const [analyser, setAnalyser] = useState(null);
  const eqColor = useDominantColor(tracks[center]?.cover);

  // Fetch chart tracks with preview URLs
  useEffect(() => {
    fetch(`${API_URL}/api/music/chart`)
      .then((r) => r.json())
      .then((data) => {
        if (data.tracks && data.tracks.length > 0) {
          const withPreviews = data.tracks
            .filter((t) => t.previewUrl && t.albumArt)
            .slice(0, 12)
            .map((t) => ({
              id: t.trackId,
              title: t.name,
              artist: t.artist,
              cover: t.albumArtBig || t.albumArt,
              albumId: t.albumId,
              preview: t.previewUrl,
            }));
          setTracks(withPreviews);
          setCenter(Math.floor(withPreviews.length / 2));
        }
      })
      .catch(() => {});
  }, []);

  const playTrack = useCallback((idx) => {
    const preview = tracks[idx]?.preview;
    if (!preview) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.crossOrigin = "anonymous";
    }
    audioRef.current.src = preview;
    audioRef.current.volume = volume;

    // Set up Web Audio API analyser (once per audio element)
    if (!audioCtxRef.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 512;
      analyserNode.smoothingTimeConstant = 0.7;
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyserNode);
      analyserNode.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyserNode;
      sourceRef.current = source;
      setAnalyser(analyserNode);
    }

    // Resume audio context if suspended (browser autoplay policy)
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }

    window.dispatchEvent(new Event("pause-background-music"));
    audioRef.current.play().catch(() => {});
    audioRef.current.onended = () => {
      const nextIdx = (idx + 1) % tracks.length;
      setCenter(nextIdx);
      doTilt("right");
      setTimeout(() => playTrack(nextIdx), 100);
    };
    setIsPlaying(true);
  }, [tracks, volume]);

  const doTilt = useCallback((dir) => {
    setTiltClass(dir === "right" ? "card-tilt-right" : "card-tilt-left");
    setTimeout(() => setTiltClass(""), 400);
  }, []);

  const prev = () => {
    const newIdx = (center - 1 + tracks.length) % tracks.length;
    setCenter(newIdx);
    doTilt("left");
    playTrack(newIdx);
  };
  const next = () => {
    const newIdx = (center + 1) % tracks.length;
    setCenter(newIdx);
    doTilt("right");
    playTrack(newIdx);
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      window.dispatchEvent(new Event("resume-background-music"));
    } else {
      playTrack(center);
    }
  };

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  // Load liked songs if logged in
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/favorites/songs`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLikedTracks(new Set(data.map((s) => s.trackId)));
        }
      })
      .catch(() => {});
  }, [token]);

  const handleHeart = async () => {
    if (!token) {
      // Open inline auth modal instead of leaving the page so the user
      // keeps their place in Explore Your Taste.
      setAuthOpen(true);
      return;
    }
    const track = tracks[center];
    if (!track) return;
    const isLiked = likedTracks.has(track.id);

    if (isLiked) {
      setLikedTracks((prev) => { const s = new Set(prev); s.delete(track.id); return s; });
      await fetch(`${API_URL}/api/favorites/songs`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ trackId: track.id }),
      }).catch(() => {});
    } else {
      setLikedTracks((prev) => new Set(prev).add(track.id));
      await fetch(`${API_URL}/api/favorites/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          trackId: track.id,
          name: track.title,
          artist: track.artist,
          albumArt: track.cover,
          albumId: track.albumId,
        }),
      }).catch(() => {});
    }
  };

  if (tracks.length === 0) return null;

  const getOffset = (i) => {
    let diff = i - center;
    if (diff > tracks.length / 2) diff -= tracks.length;
    if (diff < -tracks.length / 2) diff += tracks.length;
    return diff;
  };

  return (
    <div className="explore-section">
      <h2 className="explore-title">EXPLORE YOUR TASTE</h2>

      <div className="explore-carousel">
        <div
          className="explore-glow"
          style={{ background: eqColor || "rgba(255,255,255,0.15)" }}
        />
        {tracks.map((track, i) => {
          const offset = getOffset(i);
          if (Math.abs(offset) > 4) return null;

          const isCenter = offset === 0;
          const absOff = Math.abs(offset);
          const translateX = offset * 340;
          const translateZ = isCenter ? 0 : -120 * absOff;
          const scale = isCenter ? 1 : absOff === 1 ? 0.72 : absOff === 2 ? 0.55 : absOff === 3 ? 0.42 : 0.35;
          const opacity = isCenter ? 1 : absOff === 1 ? 0.7 : absOff === 2 ? 0.45 : absOff === 3 ? 0.25 : 0;

          return (
            <div
              key={track.id}
              className={`explore-card ${isCenter ? "explore-card-center" : ""}`}
              style={{
                transform: `translateX(${translateX}px) translateZ(${translateZ}px) scale(${scale})`,
                opacity,
                zIndex: 10 - absOff,
              }}
              onClick={() => {
                if (isCenter) {
                  navigate(`/album/${track.albumId}`);
                } else {
                  setCenter(i);
                  if (isPlaying) playTrack(i);
                }
              }}
            >
              <img src={track.cover} alt={track.title} className={`explore-card-img ${tiltClass}`} />
            </div>
          );
        })}
      </div>

      <div className="explore-info">
        <div className="explore-track-name">{tracks[center]?.title}</div>
        <div className="explore-track-artist">{tracks[center]?.artist}</div>
      </div>

      <div className="explore-controls">
        {/* Heart / Favorite */}
        <button className="explore-btn explore-btn-heart" onClick={handleHeart}>
          {tracks[center] && likedTracks.has(tracks[center].id) ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"><path fill="currentColor" d="M6.979 3.074a6 6 0 0 1 4.988 1.425l.037.033l.034-.03a6 6 0 0 1 4.733-1.44l.246.036a6 6 0 0 1 3.364 10.008l-.18.185l-.048.041l-7.45 7.379a1 1 0 0 1-1.313.082l-.094-.082l-7.493-7.422A6 6 0 0 1 6.979 3.074"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.5 12.572L12 20l-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572"/></svg>
          )}
        </button>

        <button className="explore-btn explore-btn-arrow" onClick={prev}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
        <button className="explore-btn explore-btn-play" onClick={togglePlay}>
          {isPlaying ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>
        <button className="explore-btn explore-btn-arrow" onClick={next}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
        </button>

        {/* Volume with vertical slider */}
        <div className="explore-vol-inline">
          <button className="explore-btn explore-btn-vol" onClick={() => setVolume(volume === 0 ? 0.5 : 0)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {volume === 0 ? (
                <>
                  <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                  <line x1="23" y1="9" x2="17" y2="15"/>
                  <line x1="17" y1="9" x2="23" y2="15"/>
                </>
              ) : (
                <>
                  <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </>
              )}
            </svg>
          </button>
          <div className="explore-vol-slider">
            <div className="explore-vol-fill" style={{ height: `${volume * 100}%` }} />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="explore-vol-input"
            />
          </div>
        </div>
      </div>

      <EqualizerBars analyser={analyser} playing={isPlaying} color={eqColor} />

      {/* Inline auth gate — reuses the same SignInPopup as Album Detail */}
      {authOpen && <SignInPopup onClose={() => setAuthOpen(false)} />}
    </div>
  );
}

// =============================================
// Popular Mixtapes — scroll-triggered reveal
// Title fades up, then each card staggers in.
// =============================================
function PopularMixtapes({ mixtapes, navigate }) {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`landing-top3 ${visible ? "landing-top3--visible" : ""}`} ref={sectionRef}>
      <h2 className="landing-top3-title">POPULAR MIXTAPES</h2>
      <div className="landing-top3-grid">
        {mixtapes.slice(0, 3).map((mix, i) => (
          <div
            key={mix._id}
            className="landing-top3-card"
            onClick={() => navigate(`/playlist/${mix._id}`)}
          >
            <CyclingMosaic tracks={mix.tracks} />
            <div className="landing-top3-label">{mix.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);
  const revealRefs = useRef([]);
  const [newReleases, setNewReleases] = useState([]);
  const [mixtapes, setMixtapes] = useState([]);
  const scrollRef = useRef(null);
  const releasesLeftRef = useRef(null);
  const releasesScrollRef = useRef(null);
  const releasesTrackRef = useRef(null);
  const releasesWrapRef = useRef(null);

  const count = ALBUMS.length;
  const angleStep = 360 / count;

  // Fetch new releases from Deezer chart + public playlists
  useEffect(() => {
    fetch(`${API_URL}/api/music/chart`)
      .then((r) => r.json())
      .then((data) => {
        if (data.albums) setNewReleases(data.albums.slice(0, 20));
      })
      .catch(() => {});

    fetch(`${API_URL}/api/playlists/public`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMixtapes(data.slice(0, 10));
      })
      .catch(() => {});
  }, []);

  // Scroll-driven horizontal scroll for New Releases
  useEffect(() => {
    const wrap = releasesWrapRef.current;
    const trackEl = releasesTrackRef.current;
    const textEl = releasesLeftRef.current;
    if (!wrap || !trackEl) return;

    const handleScroll = () => {
      const rect = wrap.getBoundingClientRect();
      const totalScroll = wrap.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const progress = Math.min(Math.max(scrolled / totalScroll, 0), 1);

      // Drive horizontal translate from vertical scroll progress
      const maxTranslate = trackEl.scrollWidth - window.innerWidth;
      trackEl.style.transform = `translateX(${-progress * maxTranslate}px)`;

      // Fade out "NEW RELEASES" text as albums scroll in
      if (textEl) {
        const fadeProgress = Math.min(progress * 3, 1); // fade faster
        const scale = 1 - fadeProgress * 0.6;
        const opacity = 1 - fadeProgress;
        textEl.style.transform = `translateY(-50%) scale(${scale})`;
        textEl.style.opacity = opacity;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
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

  // Scroll-driven features: show one message at a time as the user scrolls
  const featuresWrapRef = useRef(null);
  const [featuresProgress, setFeaturesProgress] = useState(-1);

  useEffect(() => {
    const handleScroll = () => {
      const wrap = featuresWrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const totalScroll = wrap.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const progress = Math.min(Math.max(scrolled / totalScroll, 0), 1);
      // Hold the title for the first bit, then advance through each feature.
      const featureProgress = (progress - 0.1) / 0.9; // after title
      if (featureProgress <= 0) {
        setFeaturesProgress(-1);
        return;
      }

      const idx = Math.min(
        FEATURES.length - 1,
        Math.max(0, Math.floor(featureProgress * FEATURES.length))
      );
      setFeaturesProgress(idx);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


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
                  transform: `rotateY(${i * angleStep}deg) translateZ(var(--ring-radius, 460px))`,
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
            GET STARTED <svg className="cta-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
          </button>
        </div>
      </div>

      {/* Scroll buffer — keeps hero visible longer */}
      <div className="landing-scroll-spacer" />

      {/* ======== FEATURES: "Mixtape lets you..." — scroll-driven ======== */}
      <div className="features-scroll-wrap" ref={featuresWrapRef}>
        <div className="features-sticky">
          <h2 className="features-title">
            MIXTAPE<br />LETS YOU<span className="landing-dot">...</span>
          </h2>
          <div className="features-display">
            {FEATURES.map((feat, i) => (
              <div
                key={i}
                className={`features-slide ${
                  i === featuresProgress
                    ? "active"
                    : i < featuresProgress
                      ? "past"
                      : "next"
                }`}
              >
                <span className="features-card-icon">{feat.icon}</span>
                <p className="features-card-text">{feat.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ======== NEW RELEASES — scroll-driven horizontal ======== */}
      {newReleases.length > 0 && (
        <div className="releases-scroll-wrap" ref={releasesWrapRef}>
          <div className="landing-releases">
            <div className="landing-releases-left" ref={releasesLeftRef}>
              <h2 className="landing-releases-label">NEW RELEASES</h2>
              <p className="landing-releases-desc">
                Fresh albums dropping this week.<br />
                Scroll to explore what's new.
              </p>
              <button
                className="landing-section-link landing-section-link-cta"
                onClick={() => navigate("/discover")}
              >
                View All <svg className="cta-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
              </button>
            </div>
            <div className="landing-releases-scroll" ref={releasesScrollRef}>
              <div className="landing-releases-track" ref={releasesTrackRef}>
                {newReleases.map((album, i) => {
                  const offsets = [0, -30, 15, -45, 8, -20, 35, -10, 25, -40, 12, -35, 30, -15, 5, -25, 20, -8, 38, -42];
                  return (
                    <div
                      key={album.id}
                      className="landing-releases-card-wrap"
                    >
                    <div
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
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======== POPULAR MIXTAPES ======== */}
      {mixtapes.length > 0 && (
        <PopularMixtapes mixtapes={mixtapes} navigate={navigate} />
      )}

      {/* ======== EXPLORE YOUR TASTE — 3D carousel ======== */}
      <ExploreCarousel navigate={navigate} token={token} />
    </div>
  );
}
