import { useState, useRef, useEffect } from "react";

// Background music — local file in public/ folder (loops)
const BG_TRACK = process.env.PUBLIC_URL + "/bg-music.mp3";

export default function MusicToggle() {
  const [playing, setPlaying] = useState(true);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(BG_TRACK);
    audio.loop = true;
    audio.volume = 0.80;
    audioRef.current = audio;

    // Autoplay on load
    audio.play().catch(() => {
      // Browsers block autoplay without user interaction.
      // Listen for the first click anywhere on the page, then start.
      setPlaying(false);
      const startOnClick = () => {
        audio.play().then(() => setPlaying(true)).catch(() => {});
        document.removeEventListener("click", startOnClick);
      };
      document.addEventListener("click", startOnClick);
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setPlaying(!playing);
  };

  return (
    <button
      className={`music-toggle ${playing ? "playing" : ""}`}
      onClick={toggle}
      aria-label={playing ? "Mute background music" : "Play background music"}
    >
      <div className="music-bars">
        <span className="bar bar-1" />
        <span className="bar bar-2" />
        <span className="bar bar-3" />
        <span className="bar bar-4" />
        <span className="bar bar-5" />
      </div>
    </button>
  );
}
