// axios is a library for making HTTP requests
const axios = require("axios");

/**
 * Search Deezer for tracks matching a query string.
 *
 * Deezer's API is completely free and requires NO API key or authentication.
 * Just call the endpoint with a query string and get results back.
 * Every track comes with a 30-second preview URL that always works.
 *
 * @param {string} query - The search term (e.g., "we dont" or "Taylor Swift")
 * @param {number} limit - Max number of results to return (default 10)
 * @returns {Array} - Simplified track objects with only the fields we need
 */
async function searchTracks(query, limit = 10) {
  // Call Deezer's search API — no auth headers needed
  // Docs: https://developers.deezer.com/api/search
  const res = await axios.get("https://api.deezer.com/search", {
    params: {
      q: query,   // The search query
      limit,      // How many results to return
    },
  });

  // Transform Deezer's response into simpler objects for our frontend
  // Deezer returns: res.data.data = [ { id, title, artist: {...}, album: {...}, preview, ... }, ... ]
  return res.data.data.map((track) => ({
    trackId: String(track.id),                  // Unique Deezer track ID (as string for consistency)
    name: track.title,                          // Song title
    artist: track.artist.name,                  // Artist name
    album: track.album.title,                   // Album name
    albumArt: track.album.cover_medium,         // Album cover image (250x250)
    previewUrl: track.preview,                  // 30-second audio preview URL (always available!)
    externalUrl: track.link,                    // Link to open the song on Deezer
    durationSec: track.duration,                // Track length in seconds
  }));
}

module.exports = { searchTracks };
