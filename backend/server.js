// TEST: Claude Code has access - you can delete this line
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const authRoutes = require("./routes/auth");
const verifyToken = require("./middleware/verifyToken");
const verifyAdmin = require("./middleware/verifyAdmin");
const User = require("./models/User");
// Import the Deezer search function from our service layer
// Deezer provides free 30-second previews with no API key required
const {
  searchTracks,
  searchAlbums,
  getChart,
  getGenres,
  getAlbumDetail,
  getArtistDetail,
  getArtistAlbums,
} = require("./services/deezer");

const app = express();
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://iat459-project.vercel.app",
    "https://iat459-project-git-main-rawitphooms-projects.vercel.app",
  ],
  credentials: true,
}));
// Raise the JSON body limit so we can accept base64-encoded mixtape cover
// images (default Express limit is only 100kb, which is smaller than most photos).
app.use(express.json({ limit: "10mb" }));

// Health check endpoint — used by UptimeRobot to keep the Render free tier
// instance warm (pinged every 5 minutes to prevent the 15-min idle spin-down).
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", service: "mixtape-api" });
});
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

// Auth endpoints: /api/auth/register and /api/auth/login
app.use("/api/auth", authRoutes);

// Connect to MongoDB using env var in .env
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// Album model for public + protected album routes
const albumSchema = new mongoose.Schema({
  title: String,
  artist: String,
  year: Number,
  genre: String,
});

const Album = mongoose.model("Album", albumSchema);

// Public: list all albums
app.get("/api/albums", async (req, res) => {
  const albums = await Album.find();
  res.json(albums);
});

// Protected route: requires a valid JWT token.
// Create a new album
app.post("/api/albums", verifyToken, async (req, res) => {
  const { title, artist, year, genre } = req.body || {};

  if (!title || !artist) {
    return res.status(400).json({ error: "Title and artist are required" });
  }

  const album = await Album.create({
    title: String(title).trim(),
    artist: String(artist).trim(),
    year: typeof year === "number" ? year : Number(year) || undefined,
    genre: genre ? String(genre).trim() : "",
  });

  res.status(201).json(album);
});

// ---- Track sub-schema for Deezer track data ----
// Each track in a playlist stores its Deezer metadata so we can
// display album art, play previews, and link to Deezer without
// needing to re-fetch from the API every time.
// { _id: false } tells Mongoose not to generate a MongoDB _id for each track.
const trackSchema = new mongoose.Schema({
  trackId: String,      // Unique Deezer track identifier
  name: String,         // Song title (e.g., "Blinding Lights")
  artist: String,       // Artist name (e.g., "The Weeknd")
  album: String,        // Album name (e.g., "After Hours")
  albumArt: String,     // URL to album cover image (250x250)
  previewUrl: String,   // URL to 30-second audio preview (always available on Deezer!)
  externalUrl: String,  // Link to open in Deezer
  durationSec: Number,  // Track length in seconds (e.g., 200 = 3:20)
}, { _id: false });

// Playlist model — tracks is an array of Deezer track objects
const playlistSchema = new mongoose.Schema({
  name: String,
  description: String,
  mood: String,             // legacy single-mood string (kept for back-compat)
  moods: [String],          // array of mood tag chips (e.g., ["Chill", "Focused"])
  image: String,            // base64 data URL or external image URL for the mixtape cover
  tracks: [trackSchema],    // Array of Deezer track objects (see trackSchema above)
  createdBy: String,        // User ID from JWT token — links playlist to its owner
  public: { type: Boolean, default: false }, // If true, visible on Discover page "Mixtapes" tab
});

const Playlist = mongoose.model("Playlist", playlistSchema);

// ---- Favorite Albums schema ----
const favoriteAlbumSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  albumId: { type: String, required: true },   // Deezer album ID
  title: String,
  artist: String,
  cover: String,                                // Album cover URL
  savedAt: { type: Date, default: Date.now },
});
favoriteAlbumSchema.index({ userId: 1, albumId: 1 }, { unique: true });
const FavoriteAlbum = mongoose.model("FavoriteAlbum", favoriteAlbumSchema);

// ---- Favorite Songs schema ----
const favoriteSongSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  trackId: { type: String, required: true },    // Deezer track ID
  name: String,
  artist: String,
  album: String,
  albumArt: String,
  previewUrl: String,
  durationSec: Number,
  savedAt: { type: Date, default: Date.now },
});
favoriteSongSchema.index({ userId: 1, trackId: 1 }, { unique: true });
const FavoriteSong = mongoose.model("FavoriteSong", favoriteSongSchema);

// Protected route: requires a valid JWT token.
// List playlists belonging to the authenticated user
app.get("/api/playlists", verifyToken, async (req, res) => {
  const playlists = await Playlist.find({ createdBy: req.user?.id });
  res.json(playlists);
});

// Protected route: requires a valid JWT token.
// Create a playlist for the authenticated user
app.post("/api/playlists", verifyToken, async (req, res) => {
  const { name, description, mood, moods, image, tracks } = req.body || {};
  const isPublic = req.body?.public || false;

  if (!name) {
    return res.status(400).json({ error: "Playlist name is required" });
  }

  // Normalise moods into an array of trimmed strings (chips from the UI)
  const moodArr = Array.isArray(moods)
    ? moods.map((m) => String(m).trim()).filter(Boolean)
    : [];

  // Keep the legacy `mood` string in sync (joined chips) for back-compat
  const moodLegacy = mood
    ? String(mood).trim()
    : moodArr.join(", ");

  const playlist = await Playlist.create({
    name: String(name).trim(),
    description: description ? String(description).trim() : "",
    mood: moodLegacy,
    moods: moodArr,
    image: image ? String(image) : "",
    tracks: Array.isArray(tracks) ? tracks : [],
    createdBy: req.user?.id,
    public: isPublic,
  });

  res.status(201).json(playlist);
});

// Update playlist
app.put("/api/playlists/:id", verifyToken, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: "Playlist not found" });
    if (playlist.createdBy !== req.user.id) return res.status(403).json({ error: "Not authorized" });

    const { name, description, image, public: isPublic, tracks } = req.body;
    if (name !== undefined) playlist.name = name;
    if (description !== undefined) playlist.description = description;
    if (image !== undefined) playlist.image = image;
    if (isPublic !== undefined) playlist.public = isPublic;
    if (tracks !== undefined) playlist.tracks = tracks;

    await playlist.save();
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: "Failed to update playlist" });
  }
});

// Toggle playlist public/private
app.patch("/api/playlists/:id/toggle-public", verifyToken, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: "Playlist not found" });
    if (String(playlist.createdBy) !== String(req.user?.id)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    playlist.public = !playlist.public;
    await playlist.save();
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle visibility" });
  }
});

// Add a track to a playlist
app.post("/api/playlists/:id/tracks", verifyToken, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: "Playlist not found" });
    if (String(playlist.createdBy) !== String(req.user?.id)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const { trackId, name, artist, album, albumArt, previewUrl, externalUrl, durationSec } = req.body || {};
    if (!trackId) return res.status(400).json({ error: "Track ID required" });
    // Don't add duplicates
    if (playlist.tracks.some((t) => t.trackId === String(trackId))) {
      return res.json(playlist);
    }
    playlist.tracks.push({ trackId: String(trackId), name, artist, album, albumArt, previewUrl, externalUrl, durationSec });
    await playlist.save();
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: "Failed to add track" });
  }
});

// Remove a track from a playlist
app.delete("/api/playlists/:id/tracks/:trackId", verifyToken, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: "Playlist not found" });
    if (String(playlist.createdBy) !== String(req.user?.id)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    playlist.tracks = playlist.tracks.filter((t) => t.trackId !== req.params.trackId);
    await playlist.save();
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: "Failed to remove track" });
  }
});

// Delete own playlist
app.delete("/api/playlists/:id", verifyToken, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: "Playlist not found" });
    if (String(playlist.createdBy) !== String(req.user?.id)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    await Playlist.findByIdAndDelete(req.params.id);
    res.json({ message: "Playlist deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete playlist" });
  }
});

// =============================================
// FAVORITE ALBUMS ROUTES
// =============================================
app.get("/api/favorites/albums", verifyToken, async (req, res) => {
  try {
    const favs = await FavoriteAlbum.find({ userId: req.user?.id }).sort({ savedAt: -1 });
    res.json(favs);
  } catch (err) {
    res.status(500).json({ error: "Failed to load favorite albums" });
  }
});

app.get("/api/favorites/albums/check/:albumId", verifyToken, async (req, res) => {
  try {
    const fav = await FavoriteAlbum.findOne({ userId: req.user?.id, albumId: req.params.albumId });
    res.json({ isFavorited: !!fav });
  } catch (err) {
    res.status(500).json({ error: "Failed to check favorite" });
  }
});

app.post("/api/favorites/albums", verifyToken, async (req, res) => {
  const { albumId, title, artist, cover } = req.body || {};
  if (!albumId) return res.status(400).json({ error: "Album ID is required" });
  try {
    const fav = await FavoriteAlbum.findOneAndUpdate(
      { userId: req.user?.id, albumId: String(albumId) },
      { userId: req.user?.id, albumId: String(albumId), title, artist, cover, savedAt: new Date() },
      { upsert: true, new: true }
    );
    res.status(201).json(fav);
  } catch (err) {
    res.status(500).json({ error: "Failed to save favorite album" });
  }
});

app.delete("/api/favorites/albums/:albumId", verifyToken, async (req, res) => {
  try {
    await FavoriteAlbum.findOneAndDelete({ userId: req.user?.id, albumId: req.params.albumId });
    res.json({ message: "Removed from favorites" });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove favorite album" });
  }
});

// =============================================
// FAVORITE SONGS ROUTES
// =============================================
app.get("/api/favorites/songs", verifyToken, async (req, res) => {
  try {
    const favs = await FavoriteSong.find({ userId: req.user?.id }).sort({ savedAt: -1 });
    res.json(favs);
  } catch (err) {
    res.status(500).json({ error: "Failed to load favorite songs" });
  }
});

app.post("/api/favorites/songs", verifyToken, async (req, res) => {
  const { trackId, name, artist, album, albumArt, previewUrl, durationSec } = req.body || {};
  if (!trackId) return res.status(400).json({ error: "Track ID is required" });
  try {
    const fav = await FavoriteSong.findOneAndUpdate(
      { userId: req.user?.id, trackId: String(trackId) },
      { userId: req.user?.id, trackId: String(trackId), name, artist, album, albumArt, previewUrl, durationSec, savedAt: new Date() },
      { upsert: true, new: true }
    );
    res.status(201).json(fav);
  } catch (err) {
    res.status(500).json({ error: "Failed to save favorite song" });
  }
});

app.delete("/api/favorites/songs/:trackId", verifyToken, async (req, res) => {
  try {
    await FavoriteSong.findOneAndDelete({ userId: req.user?.id, trackId: req.params.trackId });
    res.json({ message: "Removed from favorites" });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove favorite song" });
  }
});

// Protected route: requires a valid JWT token.
// Reset albums collection with a fixed seed list
app.post("/api/albums/seed", verifyToken, async (req, res) => {
  const seed = [
    { title: "Blonde", artist: "Frank Ocean", year: 2016, genre: "R&B" },
    { title: "Currents", artist: "Tame Impala", year: 2015, genre: "Indie" },
    { title: "DAMN.", artist: "Kendrick Lamar", year: 2017, genre: "Hip-Hop" },
    { title: "1989", artist: "Taylor Swift", year: 2014, genre: "Pop" },
    { title: "Discovery", artist: "Daft Punk", year: 2001, genre: "EDM" },
    { title: "The Dark Side of the Moon", artist: "Pink Floyd", year: 1973, genre: "Rock" },
  ];

  await Album.deleteMany({});
  const inserted = await Album.insertMany(seed);
  res.json({ inserted: inserted.length });
});

// Protected route: requires a valid JWT token.
// Delete a specific album by MongoDB id
app.delete("/api/albums/:id", verifyToken, async (req, res) => {
  const deleted = await Album.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Album not found" });
  res.json({ message: "Album deleted" });
});

// ---- Music search endpoint (powered by Deezer) ----
// Public route (no verifyToken) — both visitors and logged-in users can search.
// Deezer requires no API key.
app.get("/api/music/search", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Query parameter 'q' is required" });

  try {
    const tracks = await searchTracks(q);
    res.json(tracks);
  } catch (err) {
    // If Deezer API fails, log and return 502
    console.error("Music search error:", err.message);
    res.status(502).json({ error: "Failed to search for music" });
  }
});

// =============================================
// DEEZER API ROUTES (all public — no auth needed)
// These proxy Deezer endpoints so the frontend calls our server,
// keeping API logic on the backend (separation of concerns).
// =============================================

// Chart — top/trending albums, tracks, and artists
// Used as the default content on the Discover page
app.get("/api/music/chart", async (req, res) => {
  try {
    const chart = await getChart();
    res.json(chart);
  } catch (err) {
    console.error("Chart error:", err.message);
    res.status(502).json({ error: "Failed to load chart" });
  }
});

// Search albums by query string
app.get("/api/music/albums", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Query parameter 'q' is required" });
  try {
    const albums = await searchAlbums(q);
    res.json(albums);
  } catch (err) {
    console.error("Album search error:", err.message);
    res.status(502).json({ error: "Failed to search albums" });
  }
});

// Get all Deezer genres — used for filter dropdowns
app.get("/api/music/genres", async (req, res) => {
  try {
    const genres = await getGenres();
    res.json(genres);
  } catch (err) {
    console.error("Genres error:", err.message);
    res.status(502).json({ error: "Failed to load genres" });
  }
});

// Get a single album's full details + track list
// Used on the Album Detail page when user clicks an album card
app.get("/api/music/album/:id", async (req, res) => {
  try {
    const album = await getAlbumDetail(req.params.id);
    res.json(album);
  } catch (err) {
    console.error("Album detail error:", err.message);
    res.status(502).json({ error: "Failed to load album" });
  }
});

// Get a single artist's details + top tracks
// Used on the Artist Detail page when user clicks an artist name
app.get("/api/music/artist/:id", async (req, res) => {
  try {
    const artist = await getArtistDetail(req.params.id);
    res.json(artist);
  } catch (err) {
    console.error("Artist detail error:", err.message);
    res.status(502).json({ error: "Failed to load artist" });
  }
});

// Get albums by a specific artist
// Used for "More by [Artist]" on Album Detail page
app.get("/api/music/artist/:id/albums", async (req, res) => {
  try {
    const albums = await getArtistAlbums(req.params.id);
    res.json(albums);
  } catch (err) {
    console.error("Artist albums error:", err.message);
    res.status(502).json({ error: "Failed to load artist albums" });
  }
});

// =============================================
// REVIEWS — MongoDB model + routes
// Users can write reviews for Deezer albums.
// Each review stores the Deezer album ID so we can
// fetch reviews for any album detail page.
// =============================================
const reviewSchema = new mongoose.Schema({
  albumId: { type: String, required: true },    // Deezer album ID
  albumTitle: String,                            // Album name (for display)
  albumArt: String,                              // Album cover URL (for display)
  userId: String,                                // User who wrote the review
  username: { type: String, required: true },    // Username for display
  title: String,                                 // Review title/headline
  rating: { type: Number, min: 1, max: 5, required: true },
  text: String,                                  // Review body
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const Review = mongoose.model("Review", reviewSchema);

// Public: get all reviews for a specific album (by Deezer album ID)
app.get("/api/reviews/album/:albumId", async (req, res) => {
  try {
    const reviews = await Review.find({ albumId: req.params.albumId })
      .sort({ createdAt: -1 }); // Newest first
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: "Failed to load reviews" });
  }
});

// Protected: create a new review (must be logged in)
app.post("/api/reviews", verifyToken, async (req, res) => {
  const { albumId, albumTitle, albumArt, title, rating, text } = req.body || {};

  if (!albumId || !rating) {
    return res.status(400).json({ error: "Album ID and rating are required" });
  }

  try {
    const review = await Review.create({
      albumId: String(albumId),
      albumTitle: albumTitle || "",
      albumArt: albumArt || "",
      userId: req.user?.id,
      username: req.user?.username || "Anonymous",
      title: title ? String(title).trim() : "",
      rating: Number(rating),
      text: text ? String(text).trim() : "",
    });
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: "Failed to create review" });
  }
});

// Public: get recent reviews across all albums (for dashboard feed)
app.get("/api/reviews/recent", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 5, 20);
    const reviews = await Review.find({})
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: "Failed to load reviews" });
  }
});

// Public: get average rating for an album
app.get("/api/reviews/album/:albumId/rating", async (req, res) => {
  try {
    const result = await Review.aggregate([
      { $match: { albumId: req.params.albumId } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    if (result.length === 0) return res.json({ avg: 0, count: 0 });
    res.json({ avg: Math.round(result[0].avg * 10) / 10, count: result[0].count });
  } catch (err) {
    res.status(500).json({ error: "Failed to load rating" });
  }
});

// Seed fake reviews for testing (public — for development only)
app.post("/api/reviews/seed/:albumId", async (req, res) => {
  const { albumId } = req.params;
  const { albumTitle } = req.body || {};

  const fakeUsers = [
    "Patrick", "MusicFan42", "VinylCollector", "BassHead",
    "MelodyHunter", "SoundWave", "RhythmKing", "TuneCritic",
    "AudioPhile", "BeatDropper"
  ];

  const fakeTitles = [
    "Absolutely incredible album",
    "A masterpiece from start to finish",
    "Solid record, few weak tracks",
    "Changed my perspective on music",
    "Good but not their best work",
    "Every track is a banger",
    "Underrated gem of the year",
    "Perfect for late night listening",
    "Raw emotion in every note",
    "Will be remembered for decades"
  ];

  const fakeTexts = [
    "This album is a sonic journey that takes you through so many emotions. The production quality is top-notch and every track feels intentional. Highly recommend giving this a full listen with good headphones.",
    "I've been listening to this on repeat for weeks. The way the tracks flow into each other creates such a cohesive experience. Some of the best songwriting I've heard in a long time.",
    "Solid effort overall. A few tracks really stand out while others feel like filler. The singles are definitely the highlights, but the deep cuts grow on you after a few listens.",
    "This record pushed boundaries in ways I didn't expect. The experimental production choices really pay off, and the lyrics are incredibly personal and relatable.",
    "Not their strongest release, but still better than most of what's out there. The musicianship is undeniable and there are moments of pure brilliance scattered throughout.",
    "From the opening track to the closer, this album never loses momentum. The energy is infectious and the hooks are unforgettable. Album of the year contender for sure.",
  ];

  const reviews = [];
  const count = 6 + Math.floor(Math.random() * 5); // 6-10 reviews

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 365);
    reviews.push({
      albumId: String(albumId),
      albumTitle: albumTitle || "",
      userId: `seed_${i}`,
      username: fakeUsers[i % fakeUsers.length],
      title: fakeTitles[i % fakeTitles.length],
      rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars mostly
      text: fakeTexts[i % fakeTexts.length],
      likes: Math.floor(Math.random() * 200),
      createdAt: new Date(Date.now() - daysAgo * 86400000),
    });
  }

  try {
    await Review.deleteMany({ albumId: String(albumId) }); // Clear old seeds
    const inserted = await Review.insertMany(reviews);
    res.json({ inserted: inserted.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to seed reviews" });
  }
});

// Protected: update own review
app.put("/api/reviews/:id", verifyToken, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: "Review not found" });
    if (review.userId !== req.user?.id) return res.status(403).json({ error: "Not authorized" });

    const { title, rating, text } = req.body;
    if (title !== undefined) review.title = title;
    if (rating !== undefined) review.rating = rating;
    if (text !== undefined) review.text = text;

    await review.save();
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: "Failed to update review" });
  }
});

// Protected: delete own review
app.delete("/api/reviews/:id", verifyToken, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: "Review not found" });
    // Only the author or admin can delete
    if (review.userId !== req.user?.id && req.user?.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete review" });
  }
});

// =============================================
// USER PROFILE ROUTES
// Public endpoints to view any user's profile, playlists, and reviews.
// /api/profile/:id  — returns user info + stats
// /api/profile/:id/playlists — returns user's public playlists (or all if own profile)
// /api/profile/:id/reviews — returns user's reviews
// =============================================

// Public: get user profile info + stats
app.get("/api/profile/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    const [playlistCount, publicPlaylistCount, reviewCount, favAlbumCount, favSongCount, ratingAgg] = await Promise.all([
      Playlist.countDocuments({ createdBy: req.params.id }),
      Playlist.countDocuments({ createdBy: req.params.id, public: true }),
      Review.countDocuments({ userId: req.params.id }),
      FavoriteAlbum.countDocuments({ userId: req.params.id }),
      FavoriteSong.countDocuments({ userId: req.params.id }),
      Review.aggregate([
        { $match: { userId: req.params.id } },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      _id: user._id,
      username: user.username,
      name: user.name || "",
      email: user.email || "",
      avatar: user.avatar || "",
      role: user.role,
      createdAt: user.createdAt || null,
      stats: {
        playlists: playlistCount,
        publicPlaylists: publicPlaylistCount,
        reviews: reviewCount,
        favAlbums: favAlbumCount,
        favSongs: favSongCount,
        avgRating: ratingAgg.length > 0 ? Math.round(ratingAgg[0].avg * 10) / 10 : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load profile" });
  }
});

// Public: get a user's public playlists. If authed and viewing own profile, return all.
app.get("/api/profile/:id/playlists", async (req, res) => {
  try {
    let showAll = false;

    // If Authorization header present, check if user is viewing their own profile
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
        if (String(decoded.id) === String(req.params.id)) {
          showAll = true; // Own profile — show all playlists
        }
      } catch (e) {}
    }

    // Own profile: show all playlists. Other users: show all too (we'll filter in frontend if needed)
    const playlists = await Playlist.find({ createdBy: req.params.id }).sort({ _id: -1 });
    res.json(playlists);
  } catch (err) {
    console.error("Profile playlists error:", err);
    res.status(500).json({ error: "Failed to load playlists" });
  }
});

// Public: get a user's reviews
app.get("/api/profile/:id/reviews", async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.params.id }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: "Failed to load reviews" });
  }
});

// Public: get a user's favorite albums
app.get("/api/profile/:id/favorite-albums", async (req, res) => {
  try {
    const favs = await FavoriteAlbum.find({ userId: req.params.id }).sort({ savedAt: -1 });
    res.json(favs);
  } catch (err) {
    res.status(500).json({ error: "Failed to load favorite albums" });
  }
});

// Protected: update own profile (name, username, email, avatar)
app.put("/api/profile", verifyToken, async (req, res) => {
  try {
    const { name, username, email, avatar } = req.body;
    if (username) {
      const taken = await User.findOne({ username, _id: { $ne: req.user.id } });
      if (taken) return res.status(409).json({ error: "Username already taken" });
    }
    const update = {};
    if (name !== undefined) update.name = name;
    if (username !== undefined) update.username = username;
    if (email !== undefined) update.email = email;
    if (avatar !== undefined) update.avatar = avatar;
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select("-password");
    res.json({
      _id: user._id,
      username: user.username,
      name: user.name || "",
      email: user.email || "",
      avatar: user.avatar || "",
      role: user.role,
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Protected: change password
app.post("/api/auth/change-password", verifyToken, async (req, res) => {
  try {
    const bcrypt = require("bcryptjs");
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Missing fields" });
    if (newPassword.length < 6) return res.status(400).json({ error: "Password too short" });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(401).json({ error: "Current password is incorrect" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password updated" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Failed to change password" });
  }
});

// Public: get a user's favorite songs
app.get("/api/profile/:id/favorite-songs", async (req, res) => {
  try {
    const favs = await FavoriteSong.find({ userId: req.params.id }).sort({ savedAt: -1 });
    res.json(favs);
  } catch (err) {
    res.status(500).json({ error: "Failed to load favorite songs" });
  }
});

// =============================================
// SINGLE PLAYLIST BY ID (public)
// Used by the PlaylistDetail page — also populates the creator's username + avatar.
// =============================================
app.get("/api/playlists/detail/:id", async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: "Playlist not found" });

    // Fetch creator info
    const creator = await User.findById(playlist.createdBy, "username name avatar");
    res.json({
      ...playlist.toObject(),
      creator: creator
        ? { _id: creator._id, username: creator.username, name: creator.name, avatar: creator.avatar }
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load playlist" });
  }
});

// =============================================
// PUBLIC PLAYLISTS (Mixtapes)
// Regular GET /api/playlists returns only the logged-in user's playlists.
// This endpoint returns all playlists marked as "public" for the Discover page.
// =============================================
app.get("/api/playlists/public", async (req, res) => {
  try {
    const playlists = await Playlist.find({ public: true }).lean();

    // createdBy is a string ID, not an ObjectId ref — manually look up creators
    const creatorIds = [...new Set(playlists.map((p) => p.createdBy).filter(Boolean))];
    const creators = await User.find({ _id: { $in: creatorIds } }, "username name avatar").lean();
    const creatorMap = {};
    creators.forEach((c) => { creatorMap[c._id.toString()] = c; });

    const result = playlists.map((p) => ({
      ...p,
      creator: creatorMap[p.createdBy] || null,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to load public playlists" });
  }
});

// =============================================
// ADMIN-ONLY ROUTES
// These require both verifyToken (authentication) AND verifyAdmin (authorization).
// A regular user with a valid token will get 403 Forbidden.
// =============================================

// Admin: get all users (hides passwords)
// Used by the Admin Dashboard to manage the platform
app.get("/api/admin/users", verifyToken, verifyAdmin, async (req, res) => {
  // .select("-password") excludes the hashed password from the response
  const users = await User.find().select("-password");
  res.json(users);
});

// Admin: delete any user by ID
// Only admins can remove user accounts from the platform
app.delete("/api/admin/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  const deleted = await User.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: "User not found" });
  // Also delete all playlists that belonged to the removed user
  await Playlist.deleteMany({ createdBy: req.params.id });
  res.json({ message: "User and their playlists deleted" });
});

// Admin: get ALL playlists from every user
// Regular GET /api/playlists only returns the logged-in user's playlists
app.get("/api/admin/playlists", verifyToken, verifyAdmin, async (req, res) => {
  const playlists = await Playlist.find();
  res.json(playlists);
});

// Admin: delete any playlist by ID (regardless of owner)
// Regular users can only delete their own — admins can delete anyone's
app.delete("/api/admin/playlists/:id", verifyToken, verifyAdmin, async (req, res) => {
  const deleted = await Playlist.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Playlist not found" });
  res.json({ message: "Playlist deleted" });
});

// Start API server
app.listen(5001, () => console.log("Server running on port 5001"));
