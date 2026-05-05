import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Hard-coded Deezer cover URLs for the intro backdrop. Avoids the slow
// /api/music/chart call so the splash renders instantly. Shuffled per load
// so the layout still feels random.
const INTRO_COVERS = [
  "https://cdn-images.dzcdn.net/images/cover/10407b27dd835c6d24d05a3484b49709/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/91961aec2cb493fedea0f31efbd59d74/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/97eafa46695c2708becd77df73766e7c/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/62139d95d1424e051632edd56f013b17/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/42d99532153218c0c27e12f366db188d/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/e7096154e400af2dad487e6237be3dd2/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/cad261eafd0c6c15811200d5039b5b50/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/a0b05276a5231399968dffaa1a6b4cf0/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c75d50ec71519c41a3193da456f1236b/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/b654bdef0c0e9c48ce4a2fd54f69e1fa/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/a68dcfcec948c40262b4ae9a6397b8b8/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/d62cfe50854d4259ba2b9729e29b8496/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/5763556dd320ce7f928b4dc07f257fac/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/56ad909a8c76708060ffc09343b10231/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/da4eba19f6bc5082f46b2b330d9552b6/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/346d0083673fe51a953d3a13b554edf1/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/fb86decc775f4140fdc5c9433ac1170d/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/d68fc5f1f260273691180b9f4b77b354/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/139b7f21bd770adf219b28a529f4e0bf/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/23b006b2e956536d97612847bbd7a3b7/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/59e4be0eeff2e34f03b4e06d4d8a3df1/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/0e615f94ad59bb30ef8b0b7c3cb0eaa4/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/12df043ea6365cfa7320958abd27839d/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/e5a5a3dd33fcce5eab689d4f6ae4424a/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/ce06410f8e41bdcb11530093a74b9fce/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/0e283736baeafaa2b0b5395999013fa3/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/14db282bfe64a39588ac436b0e75f7ba/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/6e947717dede73960b99908b7d5a1eb9/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/60d056cf3af5115b5d8e3da4e09b4adf/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c9e228763cb9a9552b1c1f71a5442809/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/7b6032cdea9ae9371a085834cb44ce92/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/7c79fc0ee163260bb6fd287364a2a233/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/34530496ad5fc293deffd38dd91963ce/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/7fd665cf7ac952d0862ea0cc09d662d9/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/e81bdb5b56012bbee8ac43b4b3552025/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/af3c23fbd282c1975253595452aab10f/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/19e40d2b2fa392e9ea082acef6b931e4/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c72d99da34a2335bf61bcacc0ee4a2f1/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/e2ce3cc2d23111e956a093249396fe29/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/d07329fd5f9b346e5b19f0d028b25dc3/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/ee90f459f8d2adfbb871212793328eb2/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/dafa8b85a975fb116feb1a2143a48cb7/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/78c24c0c33797e88d3bb1aea7eb1cfa7/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/9a1084ee1062fd9cd8dbeb1a8978351d/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/9a00870420e4f0a347f620f749f3561a/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/59fe9ad9f9e997f67bfa64c7cc6c11f5/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/24a42d4ba1b4b03b9aedd55a688093f9/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/866c9033f32c1bd3a65dd7e016f275e6/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/8600c7264de55956e15ccbd3b82e7ea9/500x500-000000-80-0-0.jpg",
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/*
 * IntroPage — full-screen entry gate into the site.
 * Route: /
 *
 * The intro uses scrolling album-cover columns as a moving backdrop, then
 * hands the user off to /home once they click Enter. A session flag prevents
 * the splash from showing on every in-app navigation.
 */
export default function IntroPage() {
  const navigate = useNavigate();
  const [albums] = useState(() => shuffle(INTRO_COVERS));

  // If the user already entered the site during this browser session, skip the splash.
  useEffect(() => {
    if (sessionStorage.getItem("hasEnteredSite") === "true") {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/home", { replace: true });
      }
    }
  }, [navigate]);

  function handleEnterSite() {
    // Mark the intro as completed and trigger the landing page's background music hook.
    sessionStorage.setItem("hasEnteredSite", "true");
    window.dispatchEvent(new Event("start-background-music"));
    navigate("/home", { replace: true });
  }

  function handleEnterWithoutAudio() {
    // Same as Enter but skip dispatching the music start event.
    sessionStorage.setItem("hasEnteredSite", "true");
    navigate("/home", { replace: true });
  }

  // Build columns — duplicate covers so animation loops seamlessly
  const columnCount = Math.ceil(window.innerWidth / 160);
  const columns = [];
  for (let i = 0; i < columnCount; i++) {
    const offset = (i * 7) % Math.max(albums.length, 1);
    const shuffled = [...albums.slice(offset), ...albums.slice(0, offset)];
    // Double the list for seamless loop
    columns.push({ covers: [...shuffled, ...shuffled], direction: i % 2 === 0 ? "up" : "down" });
  }

  return (
    <div className="intro-page">
      {/* Moving cover-wall background: purely atmospheric and only rendered when covers are loaded. */}
      {albums.length > 0 && (
        <div className="intro-albums-bg">
          {columns.map((col, i) => (
            <div
              key={i}
              className={`intro-album-col ${col.direction === "up" ? "scroll-up" : "scroll-down"}`}
            >
              {col.covers.map((cover, j) => (
                <div key={j} className="intro-album-tile">
                  <img src={cover} alt="" draggable={false} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Dark overlay for readability */}
      <div className="intro-overlay" />

      {/* Center card: the actual entry point for the experience. */}
      <div className="intro-card">
        <h1 className="intro-title">MIXTAPE</h1>
        <button className="intro-enter-btn" onClick={handleEnterSite}>
          Enter
        </button>
      </div>

      {/* Skip-audio escape hatch at the bottom of the page. */}
      <button className="intro-skip-audio" onClick={handleEnterWithoutAudio}>
        ENTER WITHOUT AUDIO
      </button>
    </div>
  );
}
