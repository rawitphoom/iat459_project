const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const authRoutes = require("./routes/auth");
const verifyToken = require("./middleware/verifyToken");

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

// Playlist model for user-specific playlists
const playlistSchema = new mongoose.Schema({
  name: String,
  description: String,
  mood: String,
  tracks: [String],
  createdBy: String,
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

  if (!name) {
    return res.status(400).json({ error: "Playlist name is required" });
  }

  const playlist = await Playlist.create({
    name: String(name).trim(),
    description: description ? String(description).trim() : "",
    mood: mood ? String(mood).trim() : "",
    tracks: Array.isArray(tracks)
      ? tracks.map((t) => String(t).trim()).filter(Boolean)
      : [],
    createdBy: req.user?.id,
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

// Start API server
app.listen(5001, () => console.log("Server running on port 5001"));
