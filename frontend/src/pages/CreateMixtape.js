import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import TrackSearch from "../TrackSearch";
import API_URL from "../config";

/**
 * CreateMixtape — full page version of the "Create New Mixtape" flow.
 *
 * Layout matches the design mock:
 *   - Top bar (back arrow + close X)
 *   - Title  "CREATING MY MIXTAPE"  (MIXTAPE in copper accent)
 *   - NAME input
 *   - Two-column row:
 *       Left  : square Mixtape Image dropzone with ADD IMAGE button
 *       Right : DESCRIPTION textarea + MOOD multi-tag chip input
 *   - BROWSE TRACKS section (search bar + result list)
 *   - SAVE MIXTAPE button (centered, bottom)
 *
 * IAT459 patterns used:
 *   - useState (form state, chips, selected tracks, errors)
 *   - useContext (AuthContext for token + user)
 *   - useRef (hidden file input click)
 *   - Immutable updates (spread/filter)
 *   - JWT-protected fetch with Authorization header (Lec 6/7)
 *   - Reuses TrackSearch component (component composition)
 */
export default function CreateMixtape() {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  // ----- form state -----
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");           // base64 data URL
  const [moods, setMoods] = useState([]);           // array of chip strings
  const [moodInput, setMoodInput] = useState("");   // current chip input
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [isPublic, setIsPublic] = useState(false);  // visibility toggle

  // ----- ui state -----
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Default tracks shown in BROWSE TRACKS before the user types a query.
  // We pull from Deezer's chart endpoint so the section never feels empty.
  const [chartTracks, setChartTracks] = useState([]);

  // hidden file input for the ADD IMAGE button
  const fileInputRef = useRef(null);

  // -------- load chart tracks on mount (for the default BROWSE TRACKS list) --------
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/music/chart`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        // Take the top 12 chart tracks as our default browse list
        const list = (data?.tracks || []).slice(0, 12);
        setChartTracks(list);
      })
      .catch(() => {
        // Silently fail — the search bar still works
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // -------- image handling --------
  const handlePickImage = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const input = e.target;
    const file = input.files?.[0];
    // Reset the input value immediately so picking the same file twice
    // in a row still triggers a fresh onChange event (browser quirk).
    input.value = "";
    if (!file) return;

    // Only accept actual image files
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    // 2 MB cap so we don't blow up Mongo with huge base64 strings
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be 2MB or smaller.");
      return;
    }

    setError(""); // clear any previous error
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (typeof dataUrl === "string") {
        setImage(dataUrl);
      }
    };
    reader.onerror = () => setError("Could not read that image. Try another file.");
    reader.readAsDataURL(file);
  };

  // -------- mood chip handling --------
  const addMoodChip = (raw) => {
    const value = String(raw || "").trim();
    if (!value) return;
    if (moods.some((m) => m.toLowerCase() === value.toLowerCase())) return;
    setMoods((prev) => [...prev, value]);
    setMoodInput("");
  };

  const handleMoodKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addMoodChip(moodInput);
    } else if (e.key === "Backspace" && !moodInput && moods.length > 0) {
      // backspace on empty input → remove last chip
      setMoods((prev) => prev.slice(0, -1));
    }
  };

  const removeMoodChip = (chip) => {
    setMoods((prev) => prev.filter((m) => m !== chip));
  };

  // -------- track handling --------
  const handleAddTrack = (track) => {
    if (selectedTracks.some((t) => t.trackId === track.trackId)) return;
    setSelectedTracks((prev) => [...prev, track]);
  };

  const handleRemoveTrack = (trackId) => {
    setSelectedTracks((prev) => prev.filter((t) => t.trackId !== trackId));
  };

  // -------- save --------
  const handleSave = async (e) => {
    e?.preventDefault?.();
    setError("");

    if (!name.trim()) {
      setError("Please give your mixtape a name.");
      return;
    }
    if (selectedTracks.length === 0) {
      setError("Add at least one track to your mixtape.");
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch(`${API_URL}/api/playlists`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          image,
          moods,
          mood: moods.join(", "),
          tracks: selectedTracks,
          public: isPublic,
        }),
      });

      // Try to parse JSON, but fall back to text so we surface the real
      // error (e.g., "PayloadTooLargeError" HTML pages from Express).
      let data = null;
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { error: text?.slice(0, 200) || `HTTP ${res.status}` };
      }

      if (!res.ok) {
        setError(data?.error || `Failed to create mixtape (HTTP ${res.status}).`);
        return;
      }
      // Success → back to dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error("Create mixtape failed:", err);
      setError(
        err?.message
          ? `Save failed: ${err.message}`
          : "Server unavailable. Try again in a moment."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="create-mix-page">
      {/* ---------- Top bar ---------- */}
      <div className="create-mix-topbar">
        <button
          type="button"
          className="create-mix-iconbtn"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          ‹
        </button>
        <button
          type="button"
          className="create-mix-iconbtn"
          onClick={() => navigate("/dashboard")}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* ---------- Title ---------- */}
      <h1 className="create-mix-title">
        CREATING MY <span className="create-mix-title-accent">MIXTAPE</span>
      </h1>

      <form className="create-mix-form" onSubmit={handleSave}>
        {/* ---------- Name ---------- */}
        <div className="create-mix-field">
          <label className="create-mix-label">NAME</label>
          <input
            className="create-mix-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Deep Focus"
          />
        </div>

        {/* ---------- Image | Description + Mood ---------- */}
        <div className="create-mix-row">
          {/* LEFT: image */}
          <div className="create-mix-field create-mix-image-col">
            <label className="create-mix-label">MIXTAPE IMAGE</label>
            <div
              className={`create-mix-image-box ${image ? "has-image" : ""}`}
              onClick={handlePickImage}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" ? handlePickImage() : null)}
            >
              {image ? (
                <>
                  <img
                    src={image}
                    alt="Mixtape cover preview"
                    className="create-mix-image-preview"
                  />
                  <button
                    type="button"
                    className="create-mix-add-image-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePickImage();
                    }}
                  >
                    CHANGE IMAGE
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="create-mix-add-image-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePickImage();
                  }}
                >
                  ADD IMAGE
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </div>
          </div>

          {/* RIGHT: description + mood */}
          <div className="create-mix-right-col">
            <div className="create-mix-field">
              <label className="create-mix-label">DESCRIPTION</label>
              <textarea
                className="create-mix-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A mixtape for whenever you need to lock in."
                rows={4}
              />
            </div>

            <div className="create-mix-field">
              <label className="create-mix-label">MOOD</label>
              <div
                className="create-mix-mood-box"
                onClick={() => {
                  // clicking anywhere in the box focuses the input
                  const el = document.getElementById("create-mix-mood-input");
                  el?.focus();
                }}
              >
                <input
                  id="create-mix-mood-input"
                  className="create-mix-mood-input"
                  value={moodInput}
                  onChange={(e) => setMoodInput(e.target.value)}
                  onKeyDown={handleMoodKeyDown}
                  onBlur={() => moodInput && addMoodChip(moodInput)}
                  placeholder={moods.length === 0 ? "Type a mood and press Enter…" : ""}
                />
                <div className="create-mix-mood-chips">
                  {moods.map((chip) => (
                    <span key={chip} className="create-mix-chip">
                      {chip}
                      <button
                        type="button"
                        className="create-mix-chip-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeMoodChip(chip);
                        }}
                        aria-label={`Remove ${chip}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ---------- Visibility toggle (Public / Private) ---------- */}
            <div className="create-mix-field">
              <label className="create-mix-label">VISIBILITY</label>
              <div
                className={`create-mix-visibility ${isPublic ? "is-public" : "is-private"}`}
                role="switch"
                aria-checked={isPublic}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setIsPublic((v) => !v);
                  }
                }}
              >
                {/* Sliding pill indicator — moves left (private) or right (public) */}
                <span className="create-mix-visibility-slider" aria-hidden="true" />

                <button
                  type="button"
                  className={`create-mix-visibility-opt ${!isPublic ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPublic(false);
                  }}
                >
                  {/* lock icon */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  PRIVATE
                </button>
                <button
                  type="button"
                  className={`create-mix-visibility-opt ${isPublic ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPublic(true);
                  }}
                >
                  {/* globe icon */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  PUBLIC
                </button>
              </div>
              <p className="create-mix-visibility-hint">
                {isPublic
                  ? "Anyone can discover and listen to this mixtape."
                  : "Only you can see this mixtape on your profile."}
              </p>
            </div>
          </div>
        </div>

        {/* ---------- Browse Tracks ---------- */}
        <div className="create-mix-field create-mix-browse-field">
          <label className="create-mix-label">BROWSE TRACKS</label>
          <div className="create-mix-track-search">
            <TrackSearch
              onAddTrack={handleAddTrack}
              selectedTracks={selectedTracks}
              initialTracks={chartTracks}
            />
          </div>
        </div>

        {/* ---------- Selected Tracks (the list under the search) ---------- */}
        {selectedTracks.length > 0 && (
          <div className="create-mix-selected">
            <div className="create-mix-selected-header">
              YOUR MIXTAPE · {selectedTracks.length} TRACK
              {selectedTracks.length === 1 ? "" : "S"}
            </div>
            {selectedTracks.map((track) => (
              <div key={track.trackId} className="create-mix-selected-row">
                {track.albumArt && (
                  <img
                    src={track.albumArt}
                    alt=""
                    className="create-mix-selected-art"
                  />
                )}
                <div className="create-mix-selected-info">
                  <div className="create-mix-selected-name">
                    {(track.name || "").toUpperCase()}
                  </div>
                  <div className="create-mix-selected-artist">{track.artist}</div>
                </div>
                <div className="create-mix-selected-duration">
                  {formatDuration(track.durationSec)}
                </div>
                <button
                  type="button"
                  className="create-mix-selected-remove"
                  onClick={() => handleRemoveTrack(track.trackId)}
                  aria-label="Remove track"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ---------- Error ---------- */}
        {error && <p className="create-mix-error">{error}</p>}

        {/* ---------- Save ---------- */}
        <div className="create-mix-save-wrap">
          <button
            type="submit"
            className="create-mix-save-btn"
            disabled={isSaving}
          >
            {isSaving ? "SAVING..." : "SAVE MIXTAPE"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Helper: convert seconds → "m:ss"
function formatDuration(sec) {
  if (!sec && sec !== 0) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
