// axios is a library for making HTTP requests (similar to fetch but works in Node.js)
const axios = require("axios");

// ---- Token caching ----
// We store the Spotify access token in memory so we don't request a new one
// on every single search. Spotify tokens last ~1 hour, so we reuse until expired.
let accessToken = null;
let tokenExpiry = 0; // timestamp (ms) when the current token expires

/**
 * Get a Spotify access token using the "Client Credentials" flow.
 *
 * How it works:
 * 1. We send our Client ID + Client Secret to Spotify's token endpoint
 * 2. Spotify verifies our credentials and sends back a temporary access token
 * 3. We cache this token and reuse it until it expires
 *
 * This flow does NOT require a user to log into Spotify — it gives us
 * app-level access (good enough for searching tracks and getting previews).
 */
async function getAccessToken() {
  // If we already have a valid (non-expired) token, reuse it
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  // Pull credentials from environment variables (set in .env file)
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;

  // Guard: make sure credentials exist before trying to authenticate
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env");
  }

  // Request a new token from Spotify's auth endpoint
  // The credentials must be Base64-encoded in the format "clientId:clientSecret"
  const res = await axios.post(
    "https://accounts.spotify.com/api/token",
    // URLSearchParams formats the body as "grant_type=client_credentials"
    // which is the format Spotify expects (form-urlencoded, not JSON)
    new URLSearchParams({ grant_type: "client_credentials" }),
    {
      headers: {
        // Base64-encode "clientId:clientSecret" for the Authorization header
        // This is how Spotify identifies which app is making the request
        Authorization:
          "Basic " +
          Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  // Save the token for reuse
  accessToken = res.data.access_token;
  // Set expiry 60 seconds early so we never accidentally use an expired token
  // e.g., if Spotify says "expires_in: 3600" (1 hour), we treat it as 3540 seconds
  tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
  return accessToken;
}

/**
 * Search Spotify for tracks matching a query string.
 *
 * @param {string} query - The search term (e.g., "we dont" or "Taylor Swift")
 * @param {number} limit - Max number of results to return (default 10)
 * @returns {Array} - Simplified track objects with only the fields we need
 *
 * Spotify's raw response is very large and deeply nested. We .map() it down
 * to a flat object with just the fields our app cares about.
 */
async function searchTracks(query, limit = 10) {
  // Get a valid token (from cache or fresh from Spotify)
  const token = await getAccessToken();

  // Call Spotify's search API
  // Docs: https://developer.spotify.com/documentation/web-api/reference/search
  const res = await axios.get("https://api.spotify.com/v1/search", {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      q: query,        // The search query
      type: "track",   // We only want tracks (not albums, artists, playlists, etc.)
      limit,           // How many results to return
    },
  });

  // Transform Spotify's complex response into simpler objects for our frontend
  // Spotify returns: res.data.tracks.items = [ { id, name, artists: [...], album: {...}, ... }, ... ]
  return res.data.tracks.items.map((track) => ({
    spotifyId: track.id,                                    // Unique Spotify track ID
    name: track.name,                                       // Song title
    artist: track.artists.map((a) => a.name).join(", "),    // Artist name(s), joined if multiple
    album: track.album.name,                                // Album name
    // Album art — prefer the medium-sized image [1], fall back to the largest [0]
    albumArt: track.album.images[1]?.url || track.album.images[0]?.url || null,
    previewUrl: track.preview_url,                          // 30-second audio preview URL (can be null)
    externalUrl: track.external_urls.spotify,               // Link to open the song in Spotify
    durationMs: track.duration_ms,                          // Track length in milliseconds
  }));
}

module.exports = { searchTracks };
