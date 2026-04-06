import { useState, useRef, useEffect } from "react";

// Background music — local file in public/ folder (loops)
const BG_TRACK = process.env.PUBLIC_URL + "/bg-music.mp3";

export default function MusicToggle({ hidden = false }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(BG_TRACK);
    audio.loop = true;
    audio.volume = 0.80;
    audioRef.current = audio;

    // The intro page dispatches this event when the user presses Enter.
    const startMusic = () => {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    };

    const pauseMusic = () => {
      audio.pause();
      setPlaying(false);
    };
    const resumeMusic = () => {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    };

    window.addEventListener("start-background-music", startMusic);
    window.addEventListener("pause-background-music", pauseMusic);
    window.addEventListener("resume-background-music", resumeMusic);

    return () => {
      window.removeEventListener("start-background-music", startMusic);
      window.removeEventListener("pause-background-music", pauseMusic);
      window.removeEventListener("resume-background-music", resumeMusic);
      audio.pause();
      audio.src = "";
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  return (
    <button
      className={`music-toggle ${playing ? "playing" : "muted"}`}
      onClick={toggle}
      aria-label={playing ? "Mute background music" : "Play background music"}
      style={{ display: hidden ? "none" : "flex" }}
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
