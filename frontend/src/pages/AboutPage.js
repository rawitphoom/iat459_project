import { useNavigate } from "react-router-dom";

/*
 * AboutPage — brand/storytelling page.
 * Route: /about
 *
 * This page explains the product idea behind Mixtape, highlights the core user
 * actions, and gives visitors a clean way to continue deeper into the app.
 */
export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="info-page">
      <div className="info-container">
        {/* Intro copy: sets the tone and explains what Mixtape is about. */}
        <div className="info-eyebrow">[ ABOUT ]</div>
        <h1 className="info-title">
          MAKE IT.<br />
          SHARE IT.<br />
          <span className="info-title-accent">REMEMBER IT.</span>
        </h1>
        <p className="info-lede">
          Mixtape is a place to build music collections that feel personal again — the way a
          handmade cassette used to. Pick a mood, drop in tracks, give it a cover, and pass
          it on.
        </p>

        <div className="info-divider" />

        {/* Core value cards: the three primary things the product lets people do. */}
        <div className="info-grid">
          <div className="info-card">
            <div className="info-card-num">01</div>
            <h3 className="info-card-title">CURATE</h3>
            <p className="info-card-body">
              Search millions of tracks via the Deezer catalog and assemble mixtapes that
              actually mean something — not algorithm-shaped feeds.
            </p>
          </div>

          <div className="info-card">
            <div className="info-card-num">02</div>
            <h3 className="info-card-title">PERSONALIZE</h3>
            <p className="info-card-body">
              Add a custom cover, tag your moods, and write a description. Every mixtape is
              yours, not a template.
            </p>
          </div>

          <div className="info-card">
            <div className="info-card-num">03</div>
            <h3 className="info-card-title">SHARE</h3>
            <p className="info-card-body">
              Keep mixtapes private for yourself or set them public so anyone can discover
              what you've been listening to.
            </p>
          </div>
        </div>

        <div className="info-divider" />

        {/* Project metadata: quick context for course, stack, and timeframe. */}
        <div className="info-meta">
          <div>
            <div className="info-meta-label">BUILT FOR</div>
            <div className="info-meta-value">IAT 459 — Group 12</div>
          </div>
          <div>
            <div className="info-meta-label">STACK</div>
            <div className="info-meta-value">React · Express · MongoDB · Deezer API</div>
          </div>
          <div>
            <div className="info-meta-label">YEAR</div>
            <div className="info-meta-value">2026</div>
          </div>
        </div>

        {/* Final CTA row: one button to explore, one button to reach the team. */}
        <div className="info-cta-row">
          <button className="info-cta primary" onClick={() => navigate("/discover")}>
            EXPLORE MIXTAPES →
          </button>
          <button className="info-cta" onClick={() => navigate("/contact")}>
            GET IN TOUCH →
          </button>
        </div>
      </div>
    </div>
  );
}
