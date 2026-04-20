import { useEffect, useState, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import API_URL from "../config";
import ConfirmModal from "../components/ConfirmModal";

/*
 * ProfilePage — personal profile and library page.
 * Routes: /profile and /profile/:id
 *
 * This page does a lot of work because it doubles as:
 * - the signed-in user's own profile editor,
 * - a public-facing profile viewer,
 * - a library surface for mixtapes, reviews, favorite albums, and songs.
 *
 * Most of the state in this file exists to support modal editing flows and
 * playback / save interactions directly from the profile itself.
 */

// Module-level cache keyed by profileId. Survives navigation within the SPA
// so returning to a profile shows last-seen data instantly while a fresh
// fetch runs in the background (stale-while-revalidate).
const profileCache = new Map();

export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, logout } = useContext(AuthContext);

  const profileId = id || user?.id;
  const isOwn = !id || id === user?.id;

  // Edit profile / change password popups
  const [confirm, setConfirm] = useState(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [editProfileName, setEditProfileName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editProfileSaving, setEditProfileSaving] = useState(false);
  const [editProfileError, setEditProfileError] = useState("");
  const editAvatarFileRef = useRef(null);

  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");

  // Seed state from the module-level cache so a revisit shows data instantly.
  const cached = profileCache.get(id || user?.id);
  const [profile, setProfile] = useState(cached?.profile || null);
  const [playlists, setPlaylists] = useState(cached?.playlists || []);
  const [reviews, setReviews] = useState(cached?.reviews || []);
  const [favAlbums, setFavAlbums] = useState(cached?.favAlbums || []);
  const [favSongs, setFavSongs] = useState(cached?.favSongs || []);
  // Only show the blocking loader if we have no cached data for this profile.
  const [loading, setLoading] = useState(!cached);
  const [activeTab, setActiveTab] = useState("mixtapes");

  // Audio preview
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  // Heart popup
  const [heartPopup, setHeartPopup] = useState(null);
  const [heartPos, setHeartPos] = useState({ x: 0, y: 0 });
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [playlistTrackMap, setPlaylistTrackMap] = useState({});

  // Edit mixtape popup
  const [editPopup, setEditPopup] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [editTracks, setEditTracks] = useState([]);
  const [editSaving, setEditSaving] = useState(false);
  const editFileInputRef = useRef(null);

  // Edit review popup
  const [editReviewPopup, setEditReviewPopup] = useState(null);
  const [editReviewTitle, setEditReviewTitle] = useState("");
  const [editReviewRating, setEditReviewRating] = useState(5);
  const [editReviewText, setEditReviewText] = useState("");
  const [editReviewSaving, setEditReviewSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Fetch profile data. If we already have cached data we skip the blocking
  // loader and just refresh in the background (stale-while-revalidate).
  useEffect(() => {
    if (!profileId) return;
    const hasCache = profileCache.has(profileId);
    if (!hasCache) setLoading(true);

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.all([
      fetch(`${API_URL}/api/profile/${profileId}`).then((r) => r.json()),
      fetch(`${API_URL}/api/profile/${profileId}/playlists`, { cache: "no-store", headers }).then((r) => r.json()),
      fetch(`${API_URL}/api/profile/${profileId}/reviews`).then((r) => r.json()),
      fetch(`${API_URL}/api/profile/${profileId}/favorite-albums`).then((r) => r.json()),
      fetch(`${API_URL}/api/profile/${profileId}/favorite-songs`).then((r) => r.json()),
    ])
      .then(([profileData, playlistData, reviewData, favAlbumData, favSongData]) => {
        const nextPlaylists = Array.isArray(playlistData) ? playlistData : [];
        const nextFavAlbums = Array.isArray(favAlbumData) ? favAlbumData : [];
        const nextFavSongs = Array.isArray(favSongData) ? favSongData : [];
        setProfile(profileData);
        setPlaylists(nextPlaylists);
        setFavAlbums(nextFavAlbums);
        setFavSongs(nextFavSongs);

        const rawReviews = Array.isArray(reviewData) ? reviewData : [];
        // Enrich reviews with album art from Deezer API
        Promise.all(
          rawReviews.map(async (r) => {
            if ((r.albumArt && r.artistName) || !r.albumId) return r;
            try {
              const res = await fetch(`${API_URL}/api/music/album/${r.albumId}`);
              const album = await res.json();
              return {
                ...r,
                albumArt: r.albumArt || album.coverXl || album.cover || "",
                artistName: r.artistName || album.artist || "",
              };
            } catch { return r; }
          })
        ).then((enrichedReviews) => {
          setReviews(enrichedReviews);
          profileCache.set(profileId, {
            profile: profileData,
            playlists: nextPlaylists,
            reviews: enrichedReviews,
            favAlbums: nextFavAlbums,
            favSongs: nextFavSongs,
          });
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profileId, token]);

  // ---- Edit profile / change password handlers ----
  const openEditProfile = () => {
    setEditProfileName(profile?.name || "");
    setEditUsername(profile?.username || "");
    setEditEmail(profile?.email || "");
    setEditAvatar(profile?.avatar || "");
    setEditProfileError("");
    setEditProfileOpen(true);
  };

  const handleEditAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setEditAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!token) return;
    setEditProfileSaving(true);
    setEditProfileError("");
    try {
      const res = await fetch(`${API_URL}/api/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editProfileName,
          username: editUsername,
          email: editEmail,
          avatar: editAvatar,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditProfileError(data.error || "Failed to update profile");
        return;
      }
      setProfile((p) => ({ ...p, ...data }));
      profileCache.delete(profileId);
      setEditProfileOpen(false);
    } catch {
      setEditProfileError("Network error");
    } finally {
      setEditProfileSaving(false);
    }
  };

  const openChangePassword = () => {
    setPwCurrent("");
    setPwNew("");
    setPwConfirm("");
    setPwError("");
    setEditProfileOpen(false);
    setChangePwOpen(true);
  };

  const savePassword = async () => {
    if (!token) return;
    if (pwNew !== pwConfirm) { setPwError("Passwords do not match"); return; }
    if (pwNew.length < 6) { setPwError("Password must be at least 6 characters"); return; }
    setPwSaving(true);
    setPwError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || "Failed to change password");
        return;
      }
      setChangePwOpen(false);
    } catch {
      setPwError("Network error");
    } finally {
      setPwSaving(false);
    }
  };

  const handleSignOut = () => {
    logout?.();
    navigate("/login");
  };

  // Toggle playlist public/private
  const togglePublic = async (playlistId) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/playlists/${playlistId}/toggle-public`, {
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
  const deletePlaylist = (playlistId) => {
    if (!token) return;
    setConfirm({
      title: "Delete this mixtape?",
      message: "This action cannot be undone.",
      confirmText: "DELETE",
      onConfirm: async () => {
        setConfirm(null);
        try {
          const res = await fetch(`${API_URL}/api/playlists/${playlistId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            setPlaylists((prev) => prev.filter((p) => p._id !== playlistId));
            profileCache.delete(profileId);
          }
        } catch {}
      },
    });
  };

  // ---- Edit mixtape popup handlers ----
  const openEditPopup = (pl) => {
    setEditPopup(pl);
    setEditName(pl.name || "");
    setEditDescription(pl.description || "");
    setEditImage(pl.image || "");
    setEditIsPublic(pl.public || false);
    setEditTracks([...(pl.tracks || [])]);
  };

  const closeEditPopup = () => setEditPopup(null);

  const handleEditImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Image must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setEditImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleEditRemoveTrack = (trackId) => {
    setEditTracks((prev) => prev.filter((t) => t.trackId !== trackId));
  };

  const handleEditSave = async () => {
    if (!editName.trim()) { alert("Name is required"); return; }
    setEditSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/playlists/${editPopup._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          image: editImage,
          public: editIsPublic,
          tracks: editTracks,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPlaylists((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
        closeEditPopup();
      }
    } catch {}
    setEditSaving(false);
  };

  // ---- Edit review popup handlers ----
  const openEditReview = (review) => {
    setEditReviewPopup(review);
    setEditReviewTitle(review.title || "");
    setEditReviewRating(review.rating || 5);
    setEditReviewText(review.text || "");
  };

  const closeEditReview = () => setEditReviewPopup(null);

  const handleEditReviewSave = async () => {
    if (!editReviewRating) { alert("Rating is required"); return; }
    setEditReviewSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/reviews/${editReviewPopup._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: editReviewTitle,
          rating: editReviewRating,
          text: editReviewText,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setReviews((prev) => prev.map((r) => {
          if (r._id !== updated._id) return r;
          return {
            ...r,
            title: updated.title,
            rating: updated.rating,
            text: updated.text,
          };
        }));
        closeEditReview();
      }
    } catch {}
    setEditReviewSaving(false);
  };

  const handleDeleteReview = (reviewId) => {
    if (!token) return;
    setConfirm({
      title: "Delete this review?",
      message: "This action cannot be undone.",
      confirmText: "DELETE",
      onConfirm: async () => {
        setConfirm(null);
        try {
          const res = await fetch(`${API_URL}/api/reviews/${reviewId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            setReviews((prev) => prev.filter((r) => r._id !== reviewId));
            profileCache.delete(profileId);
          }
        } catch {}
      },
    });
  };

  useEffect(() => {
    document.body.style.overflow = (editPopup || editReviewPopup) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [editPopup, editReviewPopup]);

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
      const res = await fetch(`${API_URL}/api/playlists`, {
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
      await fetch(`${API_URL}/api/favorites/songs/${song.trackId}`, {
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
        await fetch(`${API_URL}/api/playlists/${playlistId}/tracks/${song.trackId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch(`${API_URL}/api/playlists/${playlistId}/tracks`, {
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
        <div className="discover-loader">
          <span className="discover-loader-dot" />
          <span className="discover-loader-dot" />
          <span className="discover-loader-dot" />
        </div>
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
        <div className="profile-header-left">
          <div className="profile-avatar">
            <img
              src={profile.avatar || `https://api.dicebear.com/7.x/big-smile/svg?seed=${profile.username || "user"}`}
              alt={profile.username}
              className="profile-avatar-img"
            />
          </div>
          <h1 className="profile-name">{profile.name || profile.username}</h1>
          <div className="profile-handle">{profile.username}</div>
        </div>
        <div className="profile-header-right">
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
          {isOwn && (
            <div className="profile-header-actions">
              <button className="profile-header-btn" onClick={openEditProfile}>EDIT PROFILE</button>
              <button className="profile-header-btn profile-signout-btn" onClick={handleSignOut}>SIGN OUT</button>
            </div>
          )}
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
          LIKED TRACKS ({favSongs.length})
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
                  {isOwn && (
                    <button className="profile-mixtape-edit-btn" onClick={(e) => { e.stopPropagation(); openEditPopup(pl); }}>EDIT</button>
                  )}
                  <div className="profile-mixtape-top">
                    <div className={`profile-mixtape-cover ${pl.image ? "has-custom-cover" : ""}`}>
                      {pl.image ? (
                        <img src={pl.image} alt={pl.name} className="profile-mixtape-cover-image" />
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
                        {pl.tracks?.length || 0} TRACKS
                      </div>
                      {isOwn && (
                        <div className="profile-mixtape-actions">
                          <button
                            className={`profile-visibility-toggle ${pl.public ? "public" : ""}`}
                            onClick={(e) => { e.stopPropagation(); togglePublic(pl._id); }}
                          >
                            {pl.public ? "● Public" : "○ Private"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                  <div className="profile-fav-album-cover">
                    <img
                      src={process.env.PUBLIC_URL + "/review-vinyl.svg"}
                      alt=""
                      className="profile-fav-album-vinyl"
                    />
                    <img className="profile-fav-album-img" src={fav.cover} alt={fav.title} />
                  </div>
                  <div className="profile-fav-album-bottom">
                    <div>
                      <div className="profile-fav-album-name">{fav.title}</div>
                      <div className="profile-fav-album-artist">{fav.artist}</div>
                    </div>
                    <span className="profile-fav-album-heart">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M6.979 3.074a6 6 0 0 1 4.988 1.425l.037.033l.034-.03a6 6 0 0 1 4.733-1.44l.246.036a6 6 0 0 1 3.364 10.008l-.18.185l-.048.041l-7.45 7.379a1 1 0 0 1-1.313.082l-.094-.082l-7.493-7.422A6 6 0 0 1 6.979 3.074"/></svg>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======== LIKED TRACKS TAB ======== */}
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
            <div className="profile-reviews-list">
              {reviews.map((review) => (
                <div key={review._id} className="profile-review-card">
                  <div className="profile-review-body">
                    <div className="profile-review-date">Posted {formatDate(review.createdAt)}</div>
                    <div className="profile-review-album">{review.albumTitle || "Unknown Album"}</div>
                    <div className="profile-review-artist">{review.artistName || ""}</div>
                    <div className="profile-review-stars">{renderStars(review.rating)}</div>
                    {review.title && <div className="profile-review-title">{review.title}</div>}
                    {review.text && <p className="profile-review-text">{review.text}</p>}
                  </div>
                  <div className="profile-review-right">
                    <div className="profile-review-cover">
                      <img
                        src={process.env.PUBLIC_URL + "/review-vinyl.svg"}
                        alt=""
                        className="profile-review-vinyl"
                      />
                      {review.albumArt && (
                        <img
                          src={review.albumArt}
                          alt={review.albumTitle}
                          className="profile-review-art"
                        />
                      )}
                    </div>
                    {isOwn && (
                      <button
                        className="profile-review-edit-btn"
                        onClick={() => openEditReview(review)}
                      >
                        EDIT REVIEW
                      </button>
                    )}
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

      {/* ======== EDIT MIXTAPE POPUP ======== */}
      {editPopup && (
        <div className="edit-mixtape-overlay" onClick={closeEditPopup}>
          <div className="edit-mixtape-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-mixtape-topbar">
              <button className="edit-mixtape-back" onClick={closeEditPopup}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
              </button>
              <button className="edit-mixtape-delete" onClick={async () => { await deletePlaylist(editPopup._id); closeEditPopup(); }}>
                <svg width="24" height="24" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.26949 11.82C5.26949 10.9383 5.93074 10.2215 6.74724 10.2215H11.8552C12.8691 10.1928 13.7642 9.497 14.1092 8.46583L14.1667 8.28375L14.3871 7.57075C14.5212 7.13375 14.6382 6.75234 14.803 6.41117C15.4508 5.06567 16.6507 4.13225 18.0364 3.89267C18.3891 3.83325 18.759 3.83325 19.1864 3.83325H25.8526C26.28 3.83325 26.6518 3.83325 27.0026 3.89267C28.3883 4.13225 29.5901 5.06567 30.236 6.41117C30.4008 6.75234 30.5177 7.13375 30.6519 7.57075L30.8723 8.28375L30.9298 8.46583C31.2748 9.497 32.3482 10.1947 33.364 10.2215H38.2898C39.1082 10.2215 39.7695 10.9364 39.7695 11.82C39.7695 12.7036 39.1082 13.4166 38.2917 13.4166H6.74533C5.92883 13.4166 5.26949 12.7017 5.26949 11.82Z" fill="#DB4A1E"/><path opacity="0.5" d="M22.2462 42.1667H23.7546C28.943 42.1667 31.5363 42.1667 33.2249 40.5126C34.9115 38.8566 35.084 36.1426 35.429 30.7165L35.9274 22.8946C36.1152 19.9487 36.2091 18.4767 35.3619 17.5433C34.5148 16.6099 33.0869 16.6099 30.2272 16.6099H15.7736C12.9159 16.6099 11.486 16.6099 10.6389 17.5433C9.79169 18.4767 9.88753 19.9487 10.0734 22.8946L10.5718 30.7146C10.9168 36.1445 11.0893 38.8566 12.7759 40.5126C14.4626 42.1686 17.0578 42.1667 22.2462 42.1667Z" fill="#DB4A1E"/></svg>
              </button>
            </div>

            <div className="edit-mixtape-field">
              <label className="edit-mixtape-label">NAME</label>
              <input className="edit-mixtape-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>

            <div className="edit-mixtape-row">
              <div className="edit-mixtape-field edit-mixtape-image-section">
                <label className="edit-mixtape-label">MIXTAPE IMAGE</label>
                <div className="edit-mixtape-image-box">
                  {editImage ? (
                    <img src={editImage} alt="" className="edit-mixtape-image-preview" />
                  ) : editPopup.tracks?.length > 0 ? (
                    <div className="edit-mixtape-image-mosaic">
                      {editPopup.tracks.slice(0, 4).map((t, j) => (
                        <img key={j} src={t.albumArt} alt="" />
                      ))}
                    </div>
                  ) : (
                    <div className="edit-mixtape-image-empty">♪</div>
                  )}
                </div>
                <button className="edit-mixtape-change-image" onClick={() => editFileInputRef.current?.click()}>CHANGE IMAGE</button>
                <input ref={editFileInputRef} type="file" accept="image/*" hidden onChange={handleEditImageChange} />
              </div>

              <div className="edit-mixtape-field edit-mixtape-desc-section">
                <label className="edit-mixtape-label">DESCRIPTION</label>
                <textarea className="edit-mixtape-textarea" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Add a description..." />

                <label className="edit-mixtape-label" style={{ marginTop: 20 }}>VISIBILITY</label>
                <div className={`create-mix-visibility ${editIsPublic ? "is-public" : "is-private"}`}>
                  <span className="create-mix-visibility-slider" aria-hidden="true" />
                  <button type="button" className={`create-mix-visibility-opt ${!editIsPublic ? "active" : ""}`} onClick={(e) => { e.stopPropagation(); setEditIsPublic(false); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    PRIVATE
                  </button>
                  <button type="button" className={`create-mix-visibility-opt ${editIsPublic ? "active" : ""}`} onClick={(e) => { e.stopPropagation(); setEditIsPublic(true); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                    PUBLIC
                  </button>
                </div>
              </div>
            </div>

            <div className="edit-mixtape-field edit-mixtape-tracks-section">
              <div className="edit-mixtape-tracks-header">
                <label className="edit-mixtape-label">TRACKS ({editTracks.length})</label>
                <button className="edit-mixtape-add-tracks" onClick={() => { closeEditPopup(); navigate("/search"); }}>ADD TRACKS</button>
              </div>
              <div className="edit-mixtape-tracks-list">
                {editTracks.map((track, i) => (
                  <div key={track.trackId + i} className="edit-mixtape-track-row">
                    <span className="edit-mixtape-track-num">{i + 1}</span>
                    {track.albumArt && <img src={track.albumArt} alt="" className="edit-mixtape-track-art" />}
                    <div className="edit-mixtape-track-info">
                      <div className="edit-mixtape-track-name">{track.name}</div>
                      <div className="edit-mixtape-track-artist">{track.artist}</div>
                    </div>
                    <button className="edit-mixtape-track-remove" onClick={() => handleEditRemoveTrack(track.trackId)}>—</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="edit-mixtape-bottom">
              <button className="edit-mixtape-cancel" onClick={closeEditPopup}>CANCEL</button>
              <button className="edit-mixtape-save" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? "SAVING..." : "SAVE CHANGES"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======== EDIT REVIEW POPUP ======== */}
      {editReviewPopup && (
        <div className="edit-mixtape-overlay" onClick={closeEditReview}>
          <div className="edit-review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-mixtape-topbar">
              <button className="edit-mixtape-back" onClick={closeEditReview}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
              </button>
              <button className="edit-mixtape-delete" onClick={async () => { await handleDeleteReview(editReviewPopup._id); closeEditReview(); }}>
                <svg width="24" height="24" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.26949 11.82C5.26949 10.9383 5.93074 10.2215 6.74724 10.2215H11.8552C12.8691 10.1928 13.7642 9.497 14.1092 8.46583L14.1667 8.28375L14.3871 7.57075C14.5212 7.13375 14.6382 6.75234 14.803 6.41117C15.4508 5.06567 16.6507 4.13225 18.0364 3.89267C18.3891 3.83325 18.759 3.83325 19.1864 3.83325H25.8526C26.28 3.83325 26.6518 3.83325 27.0026 3.89267C28.3883 4.13225 29.5901 5.06567 30.236 6.41117C30.4008 6.75234 30.5177 7.13375 30.6519 7.57075L30.8723 8.28375L30.9298 8.46583C31.2748 9.497 32.3482 10.1947 33.364 10.2215H38.2898C39.1082 10.2215 39.7695 10.9364 39.7695 11.82C39.7695 12.7036 39.1082 13.4166 38.2917 13.4166H6.74533C5.92883 13.4166 5.26949 12.7017 5.26949 11.82Z" fill="#DB4A1E"/><path opacity="0.5" d="M22.2462 42.1667H23.7546C28.943 42.1667 31.5363 42.1667 33.2249 40.5126C34.9115 38.8566 35.084 36.1426 35.429 30.7165L35.9274 22.8946C36.1152 19.9487 36.2091 18.4767 35.3619 17.5433C34.5148 16.6099 33.0869 16.6099 30.2272 16.6099H15.7736C12.9159 16.6099 11.486 16.6099 10.6389 17.5433C9.79169 18.4767 9.88753 19.9487 10.0734 22.8946L10.5718 30.7146C10.9168 36.1445 11.0893 38.8566 12.7759 40.5126C14.4626 42.1686 17.0578 42.1667 22.2462 42.1667Z" fill="#DB4A1E"/></svg>
              </button>
            </div>

            <div className="edit-review-album-section">
              <div className="edit-review-cover">
                <img
                  src={process.env.PUBLIC_URL + "/review-vinyl.svg"}
                  alt=""
                  className="edit-review-vinyl"
                />
                {editReviewPopup.albumArt ? (
                  <img
                    src={editReviewPopup.albumArt}
                    alt={editReviewPopup.albumTitle}
                    className="edit-review-art"
                  />
                ) : (
                  <div className="edit-review-art-placeholder">♪</div>
                )}
              </div>
              <div className="edit-review-album-info">
                <div className="edit-review-album-name">{editReviewPopup.albumTitle || "Unknown Album"}</div>
                <div className="edit-review-album-artist">{editReviewPopup.artistName || ""}</div>
              </div>
            </div>

            <div className="edit-mixtape-field">
              <label className="edit-mixtape-label">RATING</label>
              <div className="edit-review-rating-select">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`edit-review-star-pick ${n <= editReviewRating ? "active" : ""}`}
                    onClick={() => setEditReviewRating(n)}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>

            <div className="edit-mixtape-field">
              <label className="edit-mixtape-label">REVIEW TITLE</label>
              <input className="edit-mixtape-input" value={editReviewTitle} onChange={(e) => setEditReviewTitle(e.target.value)} placeholder="Review title..." />
            </div>

            <div className="edit-mixtape-field">
              <label className="edit-mixtape-label">ADD A REVIEW</label>
              <textarea className="edit-mixtape-textarea edit-review-textarea" value={editReviewText} onChange={(e) => setEditReviewText(e.target.value)} placeholder="Write your review..." />
            </div>

            <div className="edit-mixtape-bottom">
              <button className="edit-mixtape-cancel" onClick={closeEditReview}>CANCEL</button>
              <button className="edit-mixtape-save" onClick={handleEditReviewSave} disabled={editReviewSaving}>
                {editReviewSaving ? "SAVING..." : "SAVE CHANGES"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======== EDIT PROFILE POPUP ======== */}
      {editProfileOpen && (
        <div className="edit-profile-overlay" onClick={() => setEditProfileOpen(false)}>
          <div className="edit-profile-modal" onClick={(e) => e.stopPropagation()}>
            <button className="edit-profile-back" onClick={() => setEditProfileOpen(false)} aria-label="Back">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>

            <div className="edit-profile-grid">
              <div className="edit-profile-left">
                <div className="edit-profile-avatar">
                  {editAvatar ? (
                    <img src={editAvatar} alt="" />
                  ) : (
                    <span>{(editUsername || "?").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <button className="edit-profile-change-image" onClick={() => editAvatarFileRef.current?.click()}>CHANGE IMAGE</button>
                <input ref={editAvatarFileRef} type="file" accept="image/*" hidden onChange={handleEditAvatarFile} />
              </div>

              <div className="edit-profile-right">
                <div className="edit-profile-field">
                  <label className="edit-profile-label">NAME</label>
                  <input className="edit-profile-input" value={editProfileName} onChange={(e) => setEditProfileName(e.target.value)} />
                </div>

                <div className="edit-profile-field">
                  <label className="edit-profile-label">USERNAME</label>
                  <input className="edit-profile-input" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
                </div>

                <div className="edit-profile-field">
                  <label className="edit-profile-label">EMAIL</label>
                  <input className="edit-profile-input" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </div>

                <div className="edit-profile-field">
                  <label className="edit-profile-label">PASSWORD</label>
                  <div className="edit-profile-pw-row">
                    <span className="edit-profile-pw-mask">**********</span>
                    <button className="edit-profile-change-pw" onClick={openChangePassword}>CHANGE PASSWORD</button>
                  </div>
                </div>

                {editProfileError && <div className="edit-profile-error">{editProfileError}</div>}

                <div className="edit-profile-bottom">
                  <button className="edit-profile-cancel" onClick={() => setEditProfileOpen(false)}>CANCEL</button>
                  <button className="edit-profile-save" onClick={saveProfile} disabled={editProfileSaving}>
                    {editProfileSaving ? "SAVING..." : "SAVE CHANGES"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======== CHANGE PASSWORD POPUP ======== */}
      {changePwOpen && (
        <div className="edit-profile-overlay" onClick={() => setChangePwOpen(false)}>
          <div className="edit-profile-modal edit-profile-modal--pw" onClick={(e) => e.stopPropagation()}>
            <button className="edit-profile-back" onClick={() => { setChangePwOpen(false); setEditProfileOpen(true); }} aria-label="Back">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>

            <div className="edit-profile-pw-stack">
              <div className="edit-profile-field">
                <label className="edit-profile-label">CURRENT PASSWORD</label>
                <input className="edit-profile-input" type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} />
              </div>

              <div className="edit-profile-field">
                <label className="edit-profile-label">NEW PASSWORD</label>
                <input className="edit-profile-input" type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} />
              </div>

              <div className="edit-profile-field">
                <label className="edit-profile-label">CONFIRM PASSWORD</label>
                <input className="edit-profile-input" type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} />
              </div>

              {pwError && <div className="edit-profile-error">{pwError}</div>}

              <div className="edit-profile-bottom">
                <button className="edit-profile-cancel" onClick={() => setChangePwOpen(false)}>CANCEL</button>
                <button className="edit-profile-save" onClick={savePassword} disabled={pwSaving}>
                  {pwSaving ? "SAVING..." : "SAVE CHANGES"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shared confirmation modal for delete actions */}
      <ConfirmModal
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmText={confirm?.confirmText || "CONFIRM"}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
