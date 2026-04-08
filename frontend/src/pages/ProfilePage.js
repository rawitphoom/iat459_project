import { useEffect, useState, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);

  const profileId = id || user?.id;
  const isOwn = !id || id === user?.id;

  const [profile, setProfile] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [favAlbums, setFavAlbums] = useState([]);
  const [favSongs, setFavSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("mixtapes");

  // Audio preview
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  // Heart popup
  const [heartPopup, setHeartPopup] = useState(null);
  const [heartPos, setHeartPos] = useState({ x: 0, y: 0 });
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [playlistTrackMap, setPlaylistTrackMap] = useState({});

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Fetch profile data
  useEffect(() => {
    if (!profileId) return;
    setLoading(true);

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.all([
      fetch(`http://localhost:5001/api/profile/${profileId}`).then((r) => r.json()),
      fetch(`http://localhost:5001/api/profile/${profileId}/playlists`, { cache: "no-store", headers }).then((r) => r.json()),
      fetch(`http://localhost:5001/api/profile/${profileId}/reviews`).then((r) => r.json()),
      fetch(`http://localhost:5001/api/profile/${profileId}/favorite-albums`).then((r) => r.json()),
      fetch(`http://localhost:5001/api/profile/${profileId}/favorite-songs`).then((r) => r.json()),
    ])
      .then(([profileData, playlistData, reviewData, favAlbumData, favSongData]) => {
        setProfile(profileData);
        setPlaylists(Array.isArray(playlistData) ? playlistData : []);
        setReviews(Array.isArray(reviewData) ? reviewData : []);
        setFavAlbums(Array.isArray(favAlbumData) ? favAlbumData : []);
        setFavSongs(Array.isArray(favSongData) ? favSongData : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profileId, token]);

  // Toggle playlist public/private
  const togglePublic = async (playlistId) => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:5001/api/playlists/${playlistId}/toggle-public`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const updated = await res.json();
      if (res.ok) {
        setPlaylists((prev) => prev.map((p) => (p._id === playlistId ? updated : p)));
      }
    } catch {}
  };

  // Delete playlist
  const deletePlaylist = async (playlistId) => {
    if (!token || !window.confirm("Delete this mixtape?")) return;
    try {
      const res = await fetch(`http://localhost:5001/api/playlists/${playlistId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPlaylists((prev) => prev.filter((p) => p._id !== playlistId));
      }
    } catch {}
  };

  // Audio preview toggle
  const togglePreview = (track) => {
    if (!track.previewUrl) return;
    if (playingId === track.trackId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(track.previewUrl);
    audio.volume = 0.5;
    audio.play();
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(track.trackId);
  };

  // ---- Heart popup ----
  const openHeartPopup = async (e, song) => {
    if (!token) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHeartPos({ x: rect.left, y: rect.top });
    setHeartPopup(song);

    try {
      const res = await fetch("http://localhost:5001/api/playlists", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setUserPlaylists(data);
        const map = {};
        data.forEach((pl) => {
          map[pl._id] = pl.tracks?.map((t) => t.trackId) || [];
        });
        setPlaylistTrackMap(map);
      }
    } catch {}
  };

  const toggleLikedFromPopup = async () => {
    if (!heartPopup || !token) return;
    const song = heartPopup;
    try {
      await fetch(`http://localhost:5001/api/favorites/songs/${song.trackId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setFavSongs((prev) => prev.filter((s) => s.trackId !== song.trackId));
      setHeartPopup(null);
    } catch {}
  };

  const toggleTrackInPlaylist = async (playlistId) => {
    if (!heartPopup || !token) return;
    const song = heartPopup;
    const trackIds = playlistTrackMap[playlistId] || [];
    const isIn = trackIds.includes(song.trackId);

    setPlaylistTrackMap((prev) => ({
      ...prev,
      [playlistId]: isIn
        ? trackIds.filter((id) => id !== song.trackId)
        : [...trackIds, song.trackId],
    }));

    try {
      if (isIn) {
        await fetch(`http://localhost:5001/api/playlists/${playlistId}/tracks/${song.trackId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch(`http://localhost:5001/api/playlists/${playlistId}/tracks`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            trackId: song.trackId,
            name: song.name,
            artist: song.artist,
            album: song.album || "",
            albumArt: song.albumArt || "",
            previewUrl: song.previewUrl,
            durationSec: song.durationSec,
          }),
        });
      }
    } catch {}
  };

  const formatDuration = (sec) => {
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return `${min}:${String(s).padStart(2, "0")}`;
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const renderStars = (rating) => "★".repeat(rating) + "☆".repeat(5 - rating);

  if (!profileId) {
    return (
      <div className="profile-page">
        <div className="profile-empty">
          <p>Please sign in to view your profile.</p>
          <button className="profile-cta" onClick={() => navigate("/login")}>SIGN IN</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="profile-page">
        <p className="profile-loading">Loading profile...</p>
      </div>
    );
  }

  if (!profile || profile.error) {
    return (
      <div className="profile-page">
        <p className="profile-empty">User not found.</p>
        <button className="profile-cta" onClick={() => navigate("/home")}>GO HOME</button>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* ======== HEADER ======== */}
      <div className="profile-header">
        <div className="profile-avatar">
          {profile.username?.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <h1 className="profile-username">{profile.username}</h1>
          <div className="profile-stats">
            <div className="profile-stat">
              <span className="profile-stat-num">{profile.stats?.playlists || 0}</span>
              <span className="profile-stat-label">Mixtapes</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-num">{profile.stats?.favAlbums || 0}</span>
              <span className="profile-stat-label">Saved Albums</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-num">{profile.stats?.favSongs || 0}</span>
              <span className="profile-stat-label">Liked Songs</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-num">{profile.stats?.reviews || 0}</span>
              <span className="profile-stat-label">Reviews</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======== TABS ======== */}
      <div className="profile-tabs">
        <button className={`profile-tab ${activeTab === "mixtapes" ? "active" : ""}`} onClick={() => setActiveTab("mixtapes")}>
          MIXTAPES ({playlists.length})
        </button>
        <button className={`profile-tab ${activeTab === "albums" ? "active" : ""}`} onClick={() => setActiveTab("albums")}>
          SAVED ALBUMS ({favAlbums.length})
        </button>
        <button className={`profile-tab ${activeTab === "songs" ? "active" : ""}`} onClick={() => setActiveTab("songs")}>
          LIKED SONGS ({favSongs.length})
        </button>
        <button className={`profile-tab ${activeTab === "reviews" ? "active" : ""}`} onClick={() => setActiveTab("reviews")}>
          REVIEWS ({reviews.length})
        </button>
      </div>

      {/* ======== MIXTAPES TAB ======== */}
      {activeTab === "mixtapes" && (
        <div className="profile-content">
          {playlists.length === 0 ? (
            <p className="profile-empty-tab">
              {isOwn ? "You haven't created any mixtapes yet." : "No mixtapes shared yet."}
            </p>
          ) : (
            <div className="profile-mixtapes-grid">
              {playlists.map((pl) => (
                <div key={pl._id} className="profile-mixtape-card">
                  <div className="profile-mixtape-top">
                    <div className={`profile-mixtape-cover ${pl.image ? "has-custom-cover" : ""}`}>
                      {pl.image ? (
                        <img
                          src={pl.image}
                          alt={pl.name}
                          className="profile-mixtape-cover-image"
                        />
                      ) : pl.tracks?.length > 0 ? (
                        pl.tracks.slice(0, 4).map((t, j) => (
                          <img key={j} src={t.albumArt} alt="" className="profile-mixtape-thumb" />
                        ))
                      ) : (
                        <div className="profile-mixtape-empty-cover">♪</div>
                      )}
                    </div>
                    <div className="profile-mixtape-info">
                      <div className="profile-mixtape-name">{pl.name}</div>
                      <div className="profile-mixtape-meta">
                        {pl.tracks?.length || 0} tracks
                        {pl.mood ? ` · ${pl.mood}` : ""}
                      </div>
                      {pl.description && (
                        <div className="profile-mixtape-desc">{pl.description}</div>
                      )}
                      {isOwn && (
                        <div className="profile-mixtape-actions">
                          <button
                            className={`profile-visibility-toggle ${pl.public ? "public" : ""}`}
                            onClick={() => togglePublic(pl._id)}
                          >
                            {pl.public ? "● Public" : "○ Private"}
                          </button>
                          <button className="profile-delete-btn" onClick={() => deletePlaylist(pl._id)}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {pl.tracks?.length > 0 && (
                    <div className="profile-mixtape-tracks">
                      {pl.tracks.map((track, i) => (
                        <div key={track.trackId || i} className={`profile-track ${playingId === track.trackId ? "playing" : ""}`}>
                          <img className="profile-track-art" src={track.albumArt} alt={track.album} />
                          <div className="profile-track-info">
                            <div className="profile-track-name">{track.name}</div>
                            <div className="profile-track-artist">
                              {track.artist}
                              {track.durationSec ? ` · ${formatDuration(track.durationSec)}` : ""}
                            </div>
                          </div>
                          {track.previewUrl && (
                            <button
                              className={`profile-track-play ${playingId === track.trackId ? "active" : ""}`}
                              onClick={() => togglePreview(track)}
                            >
                              {playingId === track.trackId ? "❚❚" : "▶"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {isOwn && (
            <button className="profile-cta" onClick={() => navigate("/dashboard")}>
              + CREATE NEW MIXTAPE
            </button>
          )}
        </div>
      )}

      {/* ======== SAVED ALBUMS TAB ======== */}
      {activeTab === "albums" && (
        <div className="profile-content">
          {favAlbums.length === 0 ? (
            <p className="profile-empty-tab">
              {isOwn ? "You haven't saved any albums yet. Browse Discover to save albums!" : "No saved albums yet."}
            </p>
          ) : (
            <div className="profile-fav-albums-grid">
              {favAlbums.map((fav) => (
                <div
                  key={fav._id}
                  className="profile-fav-album-card"
                  onClick={() => navigate(`/album/${fav.albumId}`)}
                >
                  <img className="profile-fav-album-img" src={fav.cover} alt={fav.title} />
                  <div className="profile-fav-album-name">{fav.title}</div>
                  <div className="profile-fav-album-artist">{fav.artist}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======== LIKED SONGS TAB ======== */}
      {activeTab === "songs" && (
        <div className="profile-content">
          {favSongs.length === 0 ? (
            <p className="profile-empty-tab">
              {isOwn ? "You haven't liked any songs yet. Like songs from album pages!" : "No liked songs yet."}
            </p>
          ) : (
            <div className="profile-fav-songs-list">
              {favSongs.map((song, i) => (
                <div key={song._id} className={`profile-track ${playingId === song.trackId ? "playing" : ""}`}>
                  <span className="profile-fav-song-num">{i + 1}</span>
                  {song.albumArt && <img className="profile-track-art" src={song.albumArt} alt={song.album} />}
                  <div className="profile-track-info">
                    <div className="profile-track-name">{song.name}</div>
                    <div className="profile-track-artist">
                      {song.artist}
                      {song.album ? ` · ${song.album}` : ""}
                      {song.durationSec ? ` · ${formatDuration(song.durationSec)}` : ""}
                    </div>
                  </div>
                  {isOwn && (
                    <button
                      className="ad-track-heart liked"
                      onClick={(e) => openHeartPopup(e, song)}
                      title="Add to..."
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M6.979 3.074a6 6 0 0 1 4.988 1.425l.037.033l.034-.03a6 6 0 0 1 4.733-1.44l.246.036a6 6 0 0 1 3.364 10.008l-.18.185l-.048.041l-7.45 7.379a1 1 0 0 1-1.313.082l-.094-.082l-7.493-7.422A6 6 0 0 1 6.979 3.074"/></svg>
                    </button>
                  )}
                  {song.previewUrl && (
                    <button
                      className={`profile-track-play ${playingId === song.trackId ? "active" : ""}`}
                      onClick={() => togglePreview(song)}
                    >
                      {playingId === song.trackId ? "❚❚" : "▶"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======== REVIEWS TAB ======== */}
      {activeTab === "reviews" && (
        <div className="profile-content">
          {reviews.length === 0 ? (
            <p className="profile-empty-tab">
              {isOwn ? "You haven't written any reviews yet." : "No reviews yet."}
            </p>
          ) : (
            <div className="profile-reviews-grid">
              {reviews.map((review) => (
                <div
                  key={review._id}
                  className="profile-review-card"
                  onClick={() => review.albumId && navigate(`/album/${review.albumId}`)}
                >
                  <div className="profile-review-album">{review.albumTitle || "Unknown Album"}</div>
                  {review.title && <div className="profile-review-title">{review.title}</div>}
                  <div className="profile-review-stars">{renderStars(review.rating)}</div>
                  <p className="profile-review-text">{review.text}</p>
                  <div className="profile-review-footer">
                    <span>{formatDate(review.createdAt)}</span>
                    <span>♥ {review.likes || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* ======== HEART POPUP MODAL ======== */}
      {heartPopup && (
        <div className="heart-popup-overlay" onClick={() => setHeartPopup(null)}>
          <div
            className="heart-popup"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              left: `${Math.min(heartPos.x - 320, window.innerWidth - 360)}px`,
              top: `${Math.max(Math.min(heartPos.y - 60, window.innerHeight - 400), 20)}px`,
            }}
          >
            <div className="heart-popup-header">
              <div className="heart-popup-track">
                <strong>{heartPopup.name}</strong>
                <span>{heartPopup.artist}</span>
              </div>
              <button className="heart-popup-close" onClick={() => setHeartPopup(null)}>✕</button>
            </div>

            <div className="heart-popup-list">
              <button className="heart-popup-item active" onClick={toggleLikedFromPopup}>
                <span className="heart-popup-icon">♥</span>
                <span className="heart-popup-name">Liked Songs</span>
                <span className="heart-popup-check checked">✓</span>
              </button>

              {userPlaylists.map((pl) => {
                const isIn = (playlistTrackMap[pl._id] || []).includes(heartPopup.trackId);
                return (
                  <button
                    key={pl._id}
                    className={`heart-popup-item ${isIn ? "active" : ""}`}
                    onClick={() => toggleTrackInPlaylist(pl._id)}
                  >
                    <span className="heart-popup-icon">
                      {pl.tracks?.length > 0 && pl.tracks[0].albumArt ? (
                        <img src={pl.tracks[0].albumArt} alt="" className="heart-popup-playlist-art" />
                      ) : "♪"}
                    </span>
                    <span className="heart-popup-name">{pl.name}</span>
                    <span className={`heart-popup-check ${isIn ? "checked" : ""}`}>
                      {isIn ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>

            <button className="heart-popup-cancel" onClick={() => setHeartPopup(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
