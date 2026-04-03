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
} = require("./services/deezer");

const app = express();
app.use(cors());
app.use(express.json());
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
  mood: String,
  tracks: [trackSchema],  // Array of Deezer track objects (see trackSchema above)
  createdBy: String,      // User ID from JWT token — links playlist to its owner
  public: { type: Boolean, default: false }, // If true, visible on Discover page "Mixtapes" tab
});

const Playlist = mongoose.model("Playlist", playlistSchema);

// Protected route: requires a valid JWT token.
// List playlists belonging to the authenticated user
app.get("/api/playlists", verifyToken, async (req, res) => {
  const playlists = await Playlist.find({ createdBy: req.user?.id });
  res.json(playlists);
});

// Protected route: requires a valid JWT token.
// Create a playlist for the authenticated user
app.post("/api/playlists", verifyToken, async (req, res) => {
  const { name, description, mood, tracks } = req.body || {};
  // "public" is a reserved keyword in JS, so we grab it with bracket notation
  const isPublic = req.body?.public || false;

  if (!name) {
    return res.status(400).json({ error: "Playlist name is required" });
  }

  const playlist = await Playlist.create({
    name: String(name).trim(),
    description: description ? String(description).trim() : "",
    mood: mood ? String(mood).trim() : "",
    // tracks comes from the frontend as an array of Deezer track objects
    tracks: Array.isArray(tracks) ? tracks : [],
    createdBy: req.user?.id,
    public: isPublic,  // Whether this playlist is visible on Discover → Mixtapes tab
  });

  res.status(201).json(playlist);
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

// =============================================
// PUBLIC PLAYLISTS (Mixtapes)
// Regular GET /api/playlists returns only the logged-in user's playlists.
// This endpoint returns all playlists marked as "public" for the Discover page.
// =============================================
app.get("/api/playlists/public", async (req, res) => {
  try {
    const playlists = await Playlist.find({ public: true });
    res.json(playlists);
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
