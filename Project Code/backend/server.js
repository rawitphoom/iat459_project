const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const authRoutes = require("./routes/auth");
const verifyToken = require("./middleware/verifyToken");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

const albumSchema = new mongoose.Schema({
  title: String,
  artist: String,
  year: Number,
  genre: String,
});

const Album = mongoose.model("Album", albumSchema);

app.get("/api/albums", async (req, res) => {
  const albums = await Album.find();
  res.json(albums);
});

// Protected route: requires a valid JWT token.
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
app.delete("/api/albums/:id", verifyToken, async (req, res) => {
  const deleted = await Album.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Album not found" });
  res.json({ message: "Album deleted" });
});

app.listen(5001, () => console.log("Server running on port 5001"));
