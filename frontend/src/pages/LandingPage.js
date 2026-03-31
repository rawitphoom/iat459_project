import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <div className="landing-hero">
        <h1 className="landing-title">
          Your music.<br />
          Your playlists.<br />
          Your vibe.
        </h1>
        <p className="landing-subtitle">
          Discover albums, search tracks, and build playlists — all in one place.
        </p>
        <div className="landing-actions">
          <button className="landing-btn landing-btn-primary" onClick={() => navigate("/discover")}>
            DISCOVER
          </button>
          <button className="landing-btn landing-btn-secondary" onClick={() => navigate("/register")}>
            GET STARTED
          </button>
        </div>
      </div>
    </div>
  );
}
