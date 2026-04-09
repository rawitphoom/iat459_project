import { useState } from "react";

/*
 * ContactPage — lightweight contact / feedback page.
 * Route: /contact
 *
 * There is no backend message endpoint yet, so this page currently validates
 * the form client-side and shows a success state locally. The layout still
 * mirrors a real contact page so the UX feels complete.
 */
export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    // Keep validation intentionally simple until a real backend mail/message flow exists.
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in your name, email, and message.");
      return;
    }
    setError("");
    // No backend endpoint for messages yet — pretend-send and show confirmation.
    setSent(true);
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
  };

  return (
    <div className="info-page">
      <div className="info-container">
        {/* Page heading: frames the contact page in the same voice as the About page. */}
        <div className="info-eyebrow">[ CONTACT ]</div>
        <h1 className="info-title">
          GOT SOMETHING<br />
          <span className="info-title-accent">TO SAY?</span>
        </h1>
        <p className="info-lede">
          Bug reports, feature ideas, broken tracks, or just hello — drop us a line and
          we'll get back to you.
        </p>

        <div className="info-divider" />

        {/* Two-column layout: static contact details on the left, form on the right. */}
        <div className="contact-grid">
          {/* ---------- Left: contact info ---------- */}
          <div className="contact-info">
            <div className="contact-info-block">
              <div className="info-meta-label">EMAIL</div>
              <div className="info-meta-value">team-mixtape@sfu.ca</div>
            </div>
            <div className="contact-info-block">
              <div className="info-meta-label">LOCATION</div>
              <div className="info-meta-value">SIAT · Surrey, BC</div>
            </div>
            <div className="contact-info-block">
              <div className="info-meta-label">COURSE</div>
              <div className="info-meta-value">IAT 459 · Group 12</div>
            </div>
            <div className="contact-info-block">
              <div className="info-meta-label">RESPONSE TIME</div>
              <div className="info-meta-value">~24 HOURS</div>
            </div>
          </div>

          {/* ---------- Right: form ---------- */}
          <form className="contact-form" onSubmit={handleSubmit}>
            {/* Feedback states live inside the form so they stay close to the action area. */}
            {sent && (
              <div className="contact-success">
                ✓ MESSAGE SENT — WE'LL BE IN TOUCH.
              </div>
            )}
            {error && <div className="contact-error">{error}</div>}

            <div className="contact-field">
              <label className="contact-label">NAME</label>
              <input
                type="text"
                className="contact-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="contact-field">
              <label className="contact-label">EMAIL</label>
              <input
                type="email"
                className="contact-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="contact-field">
              <label className="contact-label">SUBJECT</label>
              <input
                type="text"
                className="contact-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What's this about?"
              />
            </div>

            <div className="contact-field">
              <label className="contact-label">MESSAGE</label>
              <textarea
                className="contact-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's on your mind..."
                rows={6}
              />
            </div>

            <button type="submit" className="info-cta primary contact-submit">
              SEND MESSAGE →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
