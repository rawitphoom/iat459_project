import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import TrackSearch from "../TrackSearch";
import API_URL from "../config";

/**
 * CreateMixtape — multi-step wizard ("onboarding flow") for building a mixtape.
 *
 * Step 0  Name        → "What should we call it?"
 * Step 1  Cover       → optional cover image (skippable)
 * Step 2  Vibe        → description, mood chips, public/private
 * Step 3  Tracks      → search & add tracks, then Save
 *
 * Inspired by Spotify's mobile create-playlist flow but with a wider, more
 * modern feel (progress bar, slide transitions, centered single-focus prompts).
 */
export default function CreateMixtape() {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  // ----- wizard state -----
  const [step, setStep] = useState(0);
  const STEPS = ["Name", "Cover", "Vibe", "Tracks"];

  // ----- form state -----
  const [name, setName] = useState("My mixtape #1");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [moods, setMoods] = useState([]);
  const [moodInput, setMoodInput] = useState("");
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [isPublic, setIsPublic] = useState(false);

  // ----- ui state -----
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [chartTracks, setChartTracks] = useState([]);
  const [genreTracks, setGenreTracks] = useState([]);
  const [genreFilter, setGenreFilter] = useState("");
  const [loadingGenre, setLoadingGenre] = useState(false);

  // Deezer genre IDs (https://api.deezer.com/genre)
  const GENRES = [
    { name: "Pop", id: 132 },
    { name: "Rock", id: 152 },
    { name: "Hip Hop", id: 116 },
    { name: "R&B", id: 165 },
    { name: "Jazz", id: 129 },
    { name: "Electronic", id: 106 },
    { name: "Dance", id: 113 },
    { name: "Latin", id: 197 },
    { name: "Classical", id: 98 },
    { name: "Reggae", id: 144 },
  ];

  const fileInputRef = useRef(null);
  const nameInputRef = useRef(null);

  // -------- preload chart tracks --------
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/music/chart`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setChartTracks((data?.tracks || []).slice(0, 12));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Compute next default name like "My mixtape #N" by scanning existing playlists
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/playlists`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        let max = 0;
        list.forEach((p) => {
          const m = /^My mixtape #(\d+)$/i.exec((p?.name || "").trim());
          if (m) max = Math.max(max, parseInt(m[1], 10));
        });
        setName(`My mixtape #${max + 1}`);
      })
      .catch(() => {});
  }, [token]);

  // Autofocus + select name input when wizard mounts
  useEffect(() => {
    if (step === 0 && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [step, name]);

  // -------- image handling --------
  const handlePickImage = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be 2MB or smaller.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (typeof dataUrl === "string") setImage(dataUrl);
    };
    reader.onerror = () => setError("Could not read that image. Try another file.");
    reader.readAsDataURL(file);
  };

  // -------- mood chips --------
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
      setMoods((prev) => prev.slice(0, -1));
    }
  };
  const removeMoodChip = (chip) =>
    setMoods((prev) => prev.filter((m) => m !== chip));

  // -------- tracks --------
  const handleAddTrack = (track) => {
    if (selectedTracks.some((t) => t.trackId === track.trackId)) return;
    setSelectedTracks((prev) => [...prev, track]);
  };
  const handleRemoveTrack = (trackId) =>
    setSelectedTracks((prev) => prev.filter((t) => t.trackId !== trackId));

  // -------- step navigation --------
  const canAdvance = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 3) return selectedTracks.length > 0;
    return true;
  };

  const goNext = () => {
    setError("");
    if (step === 0 && !name.trim()) {
      setError("Give your mixtape a name first.");
      return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const goBack = () => {
    setError("");
    if (step > 0) setStep(step - 1);
    else navigate(-1);
  };

  // -------- save --------
  const handleSave = async () => {
    setError("");
    if (!name.trim()) {
      setError("Please give your mixtape a name.");
      setStep(0);
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
      let data = null;
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) data = await res.json();
      else data = { error: (await res.text())?.slice(0, 200) || `HTTP ${res.status}` };
      if (!res.ok) {
        setError(data?.error || `Failed to create mixtape (HTTP ${res.status}).`);
        return;
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err?.message ? `Save failed: ${err.message}` : "Server unavailable.");
    } finally {
      setIsSaving(false);
    }
  };

  // -------- step content --------
  const renderStep = () => {
    if (step === 0) {
      return (
        <div className="cm-wiz-step" key="name">
          <h2 className="cm-wiz-prompt">What's your mixtape called?</h2>
          <p className="cm-wiz-sub">You can always change this later.</p>
          <input
            ref={nameInputRef}
            className="cm-wiz-bigInput"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canAdvance() && goNext()}
            placeholder="My mixtape"
            maxLength={60}
          />
          <div className="cm-wiz-counter">{name.length}/60</div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="cm-wiz-step" key="cover">
          <h2 className="cm-wiz-prompt">Add a cover</h2>
          <p className="cm-wiz-sub">Optional — pick anything that captures the mood.</p>
          <div
            className={`cm-wiz-cover ${image ? "has-image" : ""}`}
            onClick={handlePickImage}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handlePickImage()}
          >
            {image ? (
              <img src={image} alt="Cover preview" className="cm-wiz-cover-preview" />
            ) : (
              <div className="cm-wiz-cover-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Click to upload</span>
              </div>
            )}
          </div>
          {image && (
            <button type="button" className="cm-wiz-textBtn" onClick={handlePickImage}>
              Change image
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
      );
    }

    if (step === 2) {
      return (
        <div className="cm-wiz-step" key="vibe">
          <h2 className="cm-wiz-prompt">Set the vibe</h2>
          <p className="cm-wiz-sub">A short description and a few moods help others find it.</p>

          <div className="cm-wiz-field cm-wiz-field-desc">
            <label className="cm-wiz-label">DESCRIPTION</label>
            <textarea
              className="cm-wiz-textarea"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              placeholder="A mixtape for whenever you need to lock in."
              rows={2}
              maxLength={200}
            />
            <div className="cm-wiz-counter cm-wiz-counter-right">{description.length}/200</div>
          </div>

          <div className="cm-wiz-field">
            <label className="cm-wiz-label">MOOD</label>
            <div
              className="create-mix-mood-box"
              onClick={() => document.getElementById("cm-wiz-mood")?.focus()}
            >
              <input
                id="cm-wiz-mood"
                className="create-mix-mood-input"
                value={moodInput}
                onChange={(e) => setMoodInput(e.target.value)}
                onKeyDown={handleMoodKeyDown}
                onBlur={() => moodInput && addMoodChip(moodInput)}
                placeholder={moods.length === 0 ? "e.g. chill, energetic, late night" : ""}
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

          <div className="cm-wiz-field">
            <label className="cm-wiz-label">VISIBILITY</label>
            <div
              className={`create-mix-visibility ${isPublic ? "is-public" : "is-private"}`}
              role="switch"
              aria-checked={isPublic}
            >
              <span className="create-mix-visibility-slider" aria-hidden="true" />
              <button
                type="button"
                className={`create-mix-visibility-opt ${!isPublic ? "active" : ""}`}
                onClick={() => setIsPublic(false)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                PRIVATE
              </button>
              <button
                type="button"
                className={`create-mix-visibility-opt ${isPublic ? "active" : ""}`}
                onClick={() => setIsPublic(true)}
              >
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
      );
    }

    // step 3 — Tracks
    return (
      <div className="cm-wiz-step cm-wiz-step-wide" key="tracks">
        <h2 className="cm-wiz-prompt">Add some tracks</h2>
        {selectedTracks.length > 0 && (
          <p className="cm-wiz-sub">
            {selectedTracks.length} track{selectedTracks.length === 1 ? "" : "s"} added.
          </p>
        )}

        <div className="cm-wiz-genres">
          {GENRES.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`cm-wiz-genre-pill ${genreFilter === g.id ? "active" : ""}`}
              onClick={() => {
                if (genreFilter === g.id) {
                  setGenreFilter("");
                  setGenreTracks([]);
                  return;
                }
                setGenreFilter(g.id);
                setLoadingGenre(true);
                fetch(`${API_URL}/api/music/genre/${g.id}/tracks`)
                  .then((r) => r.json())
                  .then((data) => setGenreTracks(Array.isArray(data) ? data : []))
                  .catch(() => setGenreTracks([]))
                  .finally(() => setLoadingGenre(false));
              }}
            >
              {g.name}
            </button>
          ))}
        </div>

        <div className="cm-wiz-tracks-scroll">
          <div className="create-mix-track-search">
            <TrackSearch
              onAddTrack={handleAddTrack}
              selectedTracks={selectedTracks}
              initialTracks={genreFilter ? genreTracks : chartTracks}
            />
            {loadingGenre && <p className="cm-wiz-sub" style={{ marginTop: 12 }}>Loading…</p>}
          </div>

          {selectedTracks.length > 0 && (
            <div className="create-mix-selected">
            <div className="create-mix-selected-header">
              YOUR MIXTAPE · {selectedTracks.length} TRACK
              {selectedTracks.length === 1 ? "" : "S"}
            </div>
            {selectedTracks.map((track) => (
              <div key={track.trackId} className="create-mix-selected-row">
                {track.albumArt && (
                  <img src={track.albumArt} alt="" className="create-mix-selected-art" />
                )}
                <div className="create-mix-selected-info">
                  <div className="create-mix-selected-name">{track.name}</div>
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
        </div>
      </div>
    );
  };

  const isLast = step === STEPS.length - 1;

  return (
    <div className={`cm-wiz-page${isLast ? " cm-wiz-page--wide" : ""}`}>
      {/* Top bar: back (left) + progress + close (right) */}
      <div className="cm-wiz-topbar">
        <button
          type="button"
          className="cm-wiz-back"
          onClick={goBack}
          aria-label={step === 0 ? "Cancel" : "Back"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="cm-wiz-progress">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`cm-wiz-progress-seg ${i <= step ? "done" : ""}`}
            />
          ))}
        </div>
        <button
          type="button"
          className="cm-wiz-close"
          onClick={() => navigate("/dashboard")}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Step content */}
      <div className="cm-wiz-body">{renderStep()}</div>

      {/* Error */}
      {error && <p className="cm-wiz-error">{error}</p>}

      {/* Floating centered Next/Save button */}
      <div className="cm-wiz-floating-action">
        {isLast ? (
          <button
            type="button"
            className="cm-wiz-next"
            onClick={handleSave}
            disabled={isSaving || selectedTracks.length === 0}
          >
            {isSaving ? "SAVING..." : "SAVE MIXTAPE"}
          </button>
        ) : (
          <button
            type="button"
            className="cm-wiz-next"
            onClick={goNext}
            disabled={!canAdvance()}
          >
            {step === 1 && !image ? "SKIP" : "NEXT"}
          </button>
        )}
      </div>
    </div>
  );
}

function formatDuration(sec) {
  if (!sec && sec !== 0) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
