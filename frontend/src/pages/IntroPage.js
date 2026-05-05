import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Hard-coded Deezer cover URLs for the intro backdrop. Avoids the slow
// /api/music/chart call so the splash renders instantly. Shuffled per load
// so the layout still feels random.
const INTRO_COVERS = [
  "https://cdn-images.dzcdn.net/images/cover/f798a866107715dd6dc1049e498ce21f/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/519400e29d268f449cf00af879e71af6/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/de5b9b704cd4ec36f8bf49beb3e17ba2/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/9fe30ce99ef17cb1250bef071f15ccee/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/0c424dbe627530cd06a6fd408baba3f3/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/b0c86b4720b7ccf37750d466e18b981e/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/96f16ccb3da4d231b72bc5de25a16202/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/5e7b8670b572a110d4453e6ac94421d8/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/fd00ebd6d30d7253f813dba3bb1c66a9/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/478a544d29275755b3b8f7b4a1fd7a3c/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/5718f7c81c27e0b2417e2a4c45224f8a/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/311bba0fc112d15f72c8b5a65f0456c1/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/00dd0da365a94b1829302d6b7fec70e6/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/7ce6b8452fae425557067db6e6a1cad5/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/041ab5ceb6fb6ebf9512966835be9e1b/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/a7a16b8f63b1ec0e9fbd327619966737/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/2d740784396546039fe626ac2b92877b/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/00343d3c01974b351e837bdeadd67945/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/351715f1ce58dca4e5088fe40acaa6cb/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/34cd5be5dbedbf061566eb976614c25d/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/b899e98957cab00d900ada4611c39f7f/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/8919eee2a1ffe50f8eee6807db7192be/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/9eb3062eebc26c7a131ad6984f53137c/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/8213a3ed562b9e9eb33660fc34b706d2/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/4fca2bc6ebaacc930e9bc95a61b31623/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/f4a97176825a598ab5351f69822e9457/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/3b60918205a5bb30e2b2427714ec3162/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/a1a3326c5d9176c763fc3fd847b86681/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/a3c3b409f0d5bd781821ec0fd79d5b15/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/6630083f454d48eadb6a9b53f035d734/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/4c2c6143c3e83a01ea73517c57d1d138/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c0f4f022fa51f13e877aae2e758e241d/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/64e54e307bd5e2bdb27ffeb662fd910d/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/b223decfaa57910ef709736e49eaf0de/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/700f0375d5ac8570f16a2c7eb128303f/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/a175af9b7d329bc678cb4d26fc13d6de/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/05a186e0a859a36f9cd51cdae2158fe1/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/9732751ce91d786dcf30069853697078/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/e635a8510c1a74bc089b3566ebbb9cb8/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c26e4c98fcf7ba68c2a77668f092ac08/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/122fd1b9f6498e9fb8e1c148926a7d55/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/63ff8d3ecdf658d156d34d40058442c1/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/63593ab6be8e57a118b9b53784eda751/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/6029bd790f31c5112f62c352adb27572/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/36b361c2c916b333a0b7c6f949c32099/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/bd132a0670b07c6aadc4a7ee0efc8f6f/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/2af56dee5db12e4af6323afa26257ccf/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/470b179cc499f76813311609e4e3b9b9/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/57ae3715e73c0486616bab8c2d6c6159/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/66ae12120936d9660d3e30a7db7627b8/1000x1000-000000-80-0-0.jpg",
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
