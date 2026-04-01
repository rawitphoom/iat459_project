import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function IntroPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // If the user already entered the site in this tab, do not trap them here.
    if (sessionStorage.getItem("hasEnteredSite") === "true") {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/home", { replace: true });
      }
    }
  }, [navigate]);

  function handleEnterSite() {
    // Use the Enter button click as the user interaction that starts audio.
    sessionStorage.setItem("hasEnteredSite", "true");
    window.dispatchEvent(new Event("start-background-music"));
    navigate("/home", { replace: true });
  }

  return (
    <div className="intro-page">
      <div className="intro-card">
        <p className="intro-label">Mixtape</p>
        <h1 className="intro-title">Step into the music.</h1>
        <p className="intro-subtitle">
          Press enter to open the full experience with sound.
        </p>
        <button className="landing-btn landing-btn-primary" onClick={handleEnterSite}>
          ENTER
        </button>
      </div>
    </div>
  );
}
