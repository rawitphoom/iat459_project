import { useState, useRef, useEffect } from "react";
import API_URL from "./config";

/**
 * TrackSearch — Reusable component for searching songs (powered by Deezer).
 *
 * Each search result shows album art, track info, a play button for the
 * 30-second preview, and an optional "+" button to add to a playlist.
 *
 * IMPORTANT: This component does NOT render an inner <form> element.
 * It is often nested inside another <form> (e.g., the CreateMixtape page),
 * and HTML forbids nested forms — when nesting happens, browsers ignore
 * the inner form and the outer form ends up handling Enter keys / submit
 * buttons, which would refresh the parent page.
 *
 * Props:
 * - onAddTrack(track)  : Callback fired when user clicks "+" to add a track
 * - selectedTracks     : Array of tracks already selected (to show checkmarks)
 * - hideAdd            : If true, hides the "+" button (used on public page)
 * - initialTracks      : Optional array of tracks to show before any search
 *                        (e.g., chart/popular tracks). Restored if the user
 *                        clears the search box.
 */
export default function TrackSearch({ onAddTrack, selectedTracks, hideAdd, initialTracks }) {
  // The text the user typed into the search box
  const [query, setQuery] = useState("");
  // Array of track objects returned from our backend's /api/music/search.
  // Falls back to initialTracks (e.g., chart tracks) until the user searches.
  const [results, setResults] = useState(initialTracks || []);
  // Whether the user has typed a real query yet (so we know to stop showing initialTracks)
  const [hasSearched, setHasSearched] = useState(false);
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

  // Keep results in sync with initialTracks until the user runs a real search.
  // This lets parent components load chart/popular tracks asynchronously and
  // have them appear here once they arrive.
  useEffect(() => {
    if (!hasSearched && initialTracks && initialTracks.length > 0) {
      setResults(initialTracks);
    }
  }, [initialTracks, hasSearched]);

  /**
   * Actual search request to our backend.
   * Pulled out of handleSearch so it can be reused by both the
   * debounced live-search useEffect and the explicit Search button.
   */
  const runSearch = async (q) => {
    setSearching(true);
    setError("");
    try {
      const res = await fetch(
        `${API_URL}/api/music/search?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Search failed");
        return;
      }
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setError("Server unavailable");
    } finally {
      setSearching(false);
    }
  };

  /**
   * Live debounced search — fires 300ms after the user stops typing.
   * - Empty query → restore the initialTracks list (chart/popular)
   * - Non-empty query → debounced fetch
   *
   * The cleanup function (clearTimeout) ensures we cancel any pending
   * search the moment the user types another character. This is the
   * standard React debouncing pattern from Lec 3 (useEffect cleanup).
   */
  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      // User cleared the search box — go back to chart/initial tracks
      setHasSearched(false);
      setResults(initialTracks || []);
      setError("");
      return;
    }

    setHasSearched(true);
    const timer = setTimeout(() => {
      runSearch(trimmed);
    }, 300);

    // Cleanup: cancel the pending fetch if the user types again
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  /**
   * Manual search trigger — fired by the Search button or Enter key.
   * Just calls runSearch immediately (skipping the 300ms debounce).
   */
  const handleSearchClick = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setHasSearched(true);
    runSearch(trimmed);
  };

  /**
   * Handle Enter key inside the input.
   * We MUST preventDefault here because this component is often rendered
   * inside another <form>, and an unhandled Enter would otherwise submit
   * the parent form (refreshing the page and losing user data).
   */
  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchClick();
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
      {/*
        Search bar: a plain <div> (NOT a <form>) so we don't accidentally
        create nested forms when this component is dropped into a page that
        already has its own form.
      */}
      <div className="track-search-bar">
        <input
          className="input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Search songs..."
        />
        <button
          className="primary-btn"
          type="button"
          onClick={handleSearchClick}
          disabled={searching}
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </div>

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
                  type="button"
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
                    type="button"
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
