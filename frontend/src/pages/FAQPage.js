import { useNavigate } from "react-router-dom";

/*
 * FAQPage — answers to the questions visitors ask most.
 * Route: /faq
 *
 * Matches the visual style of AboutPage and ContactPage (info-page shell,
 * eyebrow + title + lede). Uses native <details>/<summary> for accordions so
 * keyboard / screen-reader behavior is free.
 */
export default function FAQPage() {
  const navigate = useNavigate();

  const faqs = [
    {
      q: "What is Mixtape?",
      a: "Mixtape is a music-cataloging app where you build personal playlists of tracks, give them covers and moods, write reviews, and share them with other listeners.",
    },
    {
      q: "Where does the music come from?",
      a: "Track and album data is pulled live from the Deezer catalog — that's millions of songs across every major genre, no API key required from you.",
    },
    {
      q: "Why are the songs only 30 seconds long?",
      a: "Deezer's free preview endpoint returns 30-second clips. Mixtape is a curation and review tool, not a streaming service — for full playback you'd open the track on a streaming platform of your choice.",
    },
    {
      q: "Do I need an account to use Mixtape?",
      a: "You can browse the home page, discover albums, and read reviews without signing in. Creating mixtapes, saving albums, liking songs, and writing reviews requires a free account.",
    },
    {
      q: "Can I keep my mixtapes private?",
      a: "Yes. Every mixtape has a Public/Private toggle. Private mixtapes only show up on your own profile; public mixtapes appear on the dashboard and other users' discover feeds.",
    },
    {
      q: "How do reviews and ratings work?",
      a: "Each album has a 5-star rating and an open text review. Your reviews appear on your profile and contribute to the album's average rating, which is shown on its detail page.",
    },
    {
      q: "Is my account data safe?",
      a: "Passwords are hashed with bcrypt before they hit the database, sessions are issued as signed JWTs, and we never store anything we don't need. We don't share data with third parties.",
    },
    {
      q: "Found a bug or want to suggest a feature?",
      a: "Head to the Contact page and send a message — we read everything and ship fixes regularly.",
    },
  ];

  return (
    <div className="info-page">
      <div className="info-container">
        {/* Intro copy */}
        <div className="info-eyebrow">[ FAQ ]</div>
        <h1 className="info-title">
          QUESTIONS.<br />
          <span className="info-title-accent">ANSWERS.</span>
        </h1>
        <p className="info-lede">
          The short version of how Mixtape works, where the music comes from, and what happens to your data.
        </p>

        <div className="info-divider" />

        {/* Question list */}
        <div className="faq-list">
          {faqs.map((item, i) => (
            <details key={i} className="faq-item">
              <summary className="faq-q">
                <span className="faq-q-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="faq-q-text">{item.q}</span>
                <span className="faq-q-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </summary>
              <p className="faq-a">{item.a}</p>
            </details>
          ))}
        </div>

        <div className="info-divider" />

        {/* CTAs that mirror the About page footer */}
        <div className="info-cta-row">
          <button className="info-cta primary" onClick={() => navigate("/contact")}>
            STILL CURIOUS? ASK
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="13 6 19 12 13 18" />
            </svg>
          </button>
          <button className="info-cta" onClick={() => navigate("/about")}>
            ABOUT MIXTAPE
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="13 6 19 12 13 18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
