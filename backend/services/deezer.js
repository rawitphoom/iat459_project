// axios is a library for making HTTP requests
const axios = require("axios");

// =============================================
// Deezer API Service
// Deezer's API is completely free and requires NO API key or authentication.
// Docs: https://developers.deezer.com/api
// =============================================

/**
 * Search Deezer for tracks matching a query string.
 * Every track comes with a 30-second preview URL that always works.
 */
async function searchTracks(query, limit = 10) {
  const res = await axios.get("https://api.deezer.com/search", {
    params: { q: query, limit },
  });

  // Transform Deezer's response into simpler objects for our frontend
  return res.data.data.map((track) => ({
    trackId: String(track.id),
    name: track.title,
    artist: track.artist.name,
    artistId: track.artist.id,           // Needed for linking to artist detail page
    album: track.album.title,
    albumId: track.album.id,             // Needed for linking to album detail page
    albumArt: track.album.cover_medium,  // 250x250 cover image
    previewUrl: track.preview,           // 30-second audio preview URL
    externalUrl: track.link,             // Link to open on Deezer
    durationSec: track.duration,         // Track length in seconds
  }));
}

/**
 * Search Deezer for albums matching a query string.
 * Returns album cover art, title, artist, and basic info.
 */
async function searchAlbums(query, limit = 20) {
  const res = await axios.get("https://api.deezer.com/search/album", {
    params: { q: query, limit },
  });

  return res.data.data.map((album) => ({
    id: album.id,
    title: album.title,
    artist: album.artist.name,
    artistId: album.artist.id,
    cover: album.cover_big || album.cover_medium,   // 500x500 for grid cards
    coverXl: album.cover_xl,                         // 1000x1000 for detail page
    link: album.link,
    recordType: album.record_type,       // "album", "single", "ep"
  }));
}

/**
 * Get the current chart — top/popular albums, tracks, and artists.
 * This is what loads by default on the Discover page.
 */
async function getChart() {
  // Deezer chart returns only 10 by default.
  // We fetch additional popular albums by querying top genres in parallel.
  const res = await axios.get("https://api.deezer.com/chart/0/albums", {
    params: { limit: 50 },
  });
  const tracksRes = await axios.get("https://api.deezer.com/chart/0/tracks", {
    params: { limit: 50 },
  });
  const artistsRes = await axios.get("https://api.deezer.com/chart/0/artists", {
    params: { limit: 50 },
  });

  // Combine into the same format as before
  const chartData = {
    albums: { data: res.data.data || [] },
    tracks: { data: tracksRes.data.data || [] },
    artists: { data: artistsRes.data.data || [] },
  };
  const resData = chartData;

  // Transform chart albums
  const albums = (resData.albums?.data || []).map((album) => ({
    id: album.id,
    title: album.title,
    artist: album.artist.name,
    artistId: album.artist.id,
    cover: album.cover_big || album.cover_medium,   // 500x500 for grid cards
    coverXl: album.cover_xl,                         // 1000x1000 for detail page
    link: album.link,
    position: album.position,            // Chart position (1, 2, 3...)
  }));

  // Transform chart tracks
  const tracks = (resData.tracks?.data || []).map((track) => ({
    trackId: String(track.id),
    name: track.title,
    artist: track.artist.name,
    artistId: track.artist.id,
    album: track.album.title,
    albumId: track.album.id,
    albumArt: track.album.cover_medium,
    albumArtBig: track.album.cover_big || track.album.cover_medium,
    previewUrl: track.preview,
    externalUrl: track.link,
    durationSec: track.duration,
    position: track.position,
  }));

  // Transform chart artists
  const artists = (resData.artists?.data || []).map((artist) => ({
    id: artist.id,
    name: artist.name,
    picture: artist.picture_medium,      // 250x250 artist photo
    pictureBig: artist.picture_big,      // 500x500
    link: artist.link,
    position: artist.position,
  }));

  return { albums, tracks, artists };
}

/**
 * Get all available genres from Deezer.
 * Used for the genre filter dropdown on Discover page.
 */
async function getGenres() {
  const res = await axios.get("https://api.deezer.com/genre");

  // Filter out "All" genre (id: 0) since it's not useful for filtering
  return res.data.data
    .filter((g) => g.id !== 0)
    .map((genre) => ({
      id: genre.id,
      name: genre.name,
      picture: genre.picture_medium,     // Genre artwork
    }));
}

/**
 * Get a single album's full details including its track list.
 * Used on the Album Detail page.
 */
async function getAlbumDetail(albumId) {
  const res = await axios.get(`https://api.deezer.com/album/${albumId}`);
  const album = res.data;

  // Fetch artist profile image in parallel — album endpoint only gives artist name/id
  let artistPicture = "";
  try {
    const artistRes = await axios.get(`https://api.deezer.com/artist/${album.artist?.id}`);
    artistPicture = artistRes.data.picture_medium || "";
  } catch {
    // Silently fail — we'll fall back to the letter avatar on frontend
  }

  return {
    id: album.id,
    title: album.title,
    artist: album.artist?.name,
    artistId: album.artist?.id,
    artistPicture, // Artist profile photo URL (250x250)
    cover: album.cover_big || album.cover_medium,     // 500x500 fallback
    coverXl: album.cover_xl,                           // 1000x1000 highest quality
    genre: album.genres?.data?.[0]?.name || "",
    releaseDate: album.release_date,
    totalTracks: album.nb_tracks,
    duration: album.duration,            // Total album duration in seconds
    link: album.link,
    // Map each track in the album
    tracks: (album.tracks?.data || []).map((track) => ({
      trackId: String(track.id),
      name: track.title,
      artist: track.artist.name,
      artistId: track.artist.id,
      album: album.title,
      albumId: album.id,
      albumArt: album.cover_medium,
      previewUrl: track.preview,
      externalUrl: track.link,
      durationSec: track.duration,
    })),
  };
}

/**
 * Get a single artist's details + top tracks.
 * Used on the Artist Detail page.
 */
async function getArtistDetail(artistId) {
  // Fetch artist info and top tracks in parallel
  const [artistRes, topRes] = await Promise.all([
    axios.get(`https://api.deezer.com/artist/${artistId}`),
    axios.get(`https://api.deezer.com/artist/${artistId}/top?limit=10`),
  ]);

  const artist = artistRes.data;

  return {
    id: artist.id,
    name: artist.name,
    picture: artist.picture_medium,
    pictureBig: artist.picture_big || artist.picture_xl,
    fans: artist.nb_fan,                 // Number of fans on Deezer
    link: artist.link,
    // Top tracks for this artist
    topTracks: (topRes.data.data || []).map((track) => ({
      trackId: String(track.id),
      name: track.title,
      artist: track.artist.name,
      artistId: track.artist.id,
      album: track.album.title,
      albumId: track.album.id,
      albumArt: track.album.cover_medium,
      previewUrl: track.preview,
      externalUrl: track.link,
      durationSec: track.duration,
    })),
  };
}

/**
 * Get albums by a specific artist.
 * Used for "More by [Artist]" section on Album Detail page.
 */
async function getArtistAlbums(artistId, limit = 10) {
  const res = await axios.get(`https://api.deezer.com/artist/${artistId}/albums`, {
    params: { limit },
  });

  return (res.data.data || []).map((album) => ({
    id: album.id,
    title: album.title,
    artist: album.artist?.name || "",
    cover: album.cover_big || album.cover_medium,
    coverXl: album.cover_xl,
    releaseDate: album.release_date,
    recordType: album.record_type,
  }));
}

/**
 * Get top tracks for a specific Deezer genre.
 * Used by the Create Mixtape genre filter pills.
 */
async function getGenreTracks(genreId, limit = 25) {
  const res = await axios.get(`https://api.deezer.com/chart/${genreId}/tracks`, {
    params: { limit },
  });
  return (res.data.data || []).map((track) => ({
    trackId: String(track.id),
    name: track.title,
    artist: track.artist.name,
    artistId: track.artist.id,
    album: track.album.title,
    albumId: track.album.id,
    albumArt: track.album.cover_medium,
    previewUrl: track.preview,
    externalUrl: track.link,
    durationSec: track.duration,
  }));
}

module.exports = {
  searchTracks,
  searchAlbums,
  getChart,
  getGenres,
  getGenreTracks,
  getAlbumDetail,
  getArtistDetail,
  getArtistAlbums,
};
