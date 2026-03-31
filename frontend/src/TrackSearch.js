import { useState, useRef } from "react";

/**
 * TrackSearch — Reusable component for searching songs (powered by Deezer).
 *
 * Each search result shows album art, track info, a play button for the
 * 30-second preview, and an optional "+" button to add to a playlist.
 *
 * Props:
 * - onAddTrack(track)  : Callback fired when user clicks "+" to add a track
 * - selectedTracks     : Array of tracks already selected (to show checkmarks)
 * - hideAdd            : If true, hides the "+" button (used on public page)
 */
export default function TrackSearch({ onAddTrack, selectedTracks, hideAdd }) {
  // The text the user typed into the search box
  const [query, setQuery] = useState("");
  // Array of track objects returned from our backend's /api/music/search
  const [results, setResults] = useState([]);
  // Loading state
  const [searching, setSearching] = useState(false);
  // Error message to display if search fails
  const [error, setError] = useState("");
  // Which track's preview is currently playing (tracked by trackId)
  const [playingId, setPlayingId] = useState(null);
  // useRef holds a reference to the current Audio object.
  // We use useRef instead of useState because changing the Audio object
  // doesn't need to trigger a re-render — we just need to call .pause() on it.
  const audioRef = useRef(null);

  /**
   * Called when the search form is submitted.
   * Sends the query to our backend, which forwards it to Deezer's API.
   */
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError("");
    try {
      // Call our backend endpoint (NOT Deezer directly — keeps the API layer consistent)
      const res = await fetch(
        `http://localhost:5001/api/music/search?q=${encodeURIComponent(query.trim())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Search failed");
        return;
      }
      setResults(data);
    } catch {
      setError("Server unavailable");
    } finally {
      setSearching(false);
    }
  };

  /**
   * Play or pause a 30-second audio preview for a track.
   *
   * How it works:
   * 1. If the same track is already playing → pause it
   * 2. If a different track is playing → pause the old one, play the new one
   * 3. Creates a new Audio object from the track's previewUrl
   * 4. When the preview finishes, reset the playing state
   */
  const togglePreview = (track) => {
    if (!track.previewUrl) return;

    // If this track is already playing, pause it (toggle off)
    if (playingId === track.trackId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    // If a different track is playing, stop it first
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Create a new HTML5 Audio element and play the 30-second preview
    const audio = new Audio(track.previewUrl);
    audio.volume = 0.5;
    audio.play();
    // When the preview ends naturally, reset the playing state
    audio.onended = () => setPlayingId(null);
    // Store the Audio object in the ref so we can pause it later
    audioRef.current = audio;
    setPlayingId(track.trackId);
  };

  /**
   * Check if a track has already been added to the playlist.
   */
  const isSelected = (trackId) =>
    selectedTracks.some((t) => t.trackId === trackId);

  /**
   * Convert seconds to "m:ss" format (e.g., 200 → "3:20")
   */
  const formatDuration = (sec) => {
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return `${min}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="track-search">
      {/* Search bar: input + submit button */}
      <form className="track-search-bar" onSubmit={handleSearch}>
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs..."
        />
        <button className="primary-btn" type="submit" disabled={searching}>
          {searching ? "Searching..." : "Search"}
        </button>
      </form>

      {/* Show error message if search failed */}
      {error && <p className="error-text">{error}</p>}

      {/* Search results list */}
      {results.length > 0 && (
        <div className="track-results">
          {results.map((track) => (
            <div
              key={track.trackId}
              className={`track-row ${isSelected(track.trackId) ? "selected" : ""}`}
            >
              {/* Album cover art thumbnail */}
              {track.albumArt && (
                <img
                  className="track-art"
                  src={track.albumArt}
                  alt={track.album}
                />
              )}

              {/* Track name, artist, album, and duration */}
              <div className="track-info">
                <div className="track-name">{track.name}</div>
                <div className="track-artist">
                  {track.artist} &middot; {track.album} &middot;{" "}
                  {formatDuration(track.durationSec)}
                </div>
              </div>

              {/* Action buttons: play preview + add to playlist */}
              <div className="track-actions">
                {/* Play/pause button — plays a 30-second audio preview */}
                <button
                  className={`icon-btn play-btn ${playingId === track.trackId ? "playing" : ""}`}
                  onClick={() => togglePreview(track)}
                  title={playingId === track.trackId ? "Pause" : "Play preview"}
                >
                  {/* Show pause icon (⏸) if playing, play icon (▶) if not */}
                  {playingId === track.trackId ? "\u23F8" : "\u25B6"}
                </button>

                {/* "+" button to add track to playlist — hidden on public page via hideAdd prop */}
                {!hideAdd && (
                  <button
                    className="icon-btn add-btn"
                    onClick={() => onAddTrack(track)}
                    disabled={isSelected(track.trackId)}
                    title={isSelected(track.trackId) ? "Already added" : "Add to playlist"}
                  >
                    {isSelected(track.trackId) ? "\u2713" : "+"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
