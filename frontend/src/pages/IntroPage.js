import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/*
 * IntroPage — full-screen entry gate into the site.
 * Route: /
 *
 * The intro uses scrolling album-cover columns as a moving backdrop, then
 * hands the user off to /home once they click Enter. A session flag prevents
 * the splash from showing on every in-app navigation.
 *
 * Album covers are hardcoded (curated from Deezer's public CDN across multiple
 * genres) and shuffled on each page load so the wall looks different every
 * time without depending on a live API call.
 */

// Curated 110 album covers spanning rock, pop, metal, jazz, hip-hop, indie,
// electronic, classical, soul, country, punk, and ambient. URLs point at
// Deezer's public CDN. Replace / extend this list to refresh the wall.
const INTRO_COVERS = [
  "https://cdn-images.dzcdn.net/images/cover/00c7e34e12ed0886a21ee06e25aaa23b/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/04f1197a320a3fdf0f116411465a2f61/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/0651360337caffc8ea8963054dd0a693/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/06661fb250ba6de1b5aa229aad346593/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/0abbf20dc05b5c4a8533626075be0f5c/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/1c5db3da0011fab0475cdbf7b39a5c14/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/1d21ffb7e25b24c3f07c328178c67a82/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/1ed6377c8c9e8e781e6307576f656d6b/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/1f8d111730440c60af08809b7281bd1e/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/22df6212ca5a43b3ec83caa814e8da16/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/291e2af9295ca885b154eee75dfa0432/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/2a44c6cc1e5885d237bb5b18defa5ef3/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/2c5407678d4e69b44ae5ab7b857db2a9/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/2eae681eb0b1f111481cd32b95326e35/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/2edd6d9f2f6357079cb1a4ec776cba6c/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/3020cc256b8bd705b1b530d01d45f984/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/30dc9cb107b030f3b6bdb8d323a1bcb8/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/31a0064caa8bd5055a4ee7cbebbda1df/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/31a3714941969065f3a01a671c0b3b56/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/3b23cb9969096d0a8104ee30a5280b23/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/3c52eeed70e122b31afda9c86e52daa9/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/3f0a31971cf384986e86b0b909c230fa/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/428642b199132ce01616beb9430383dc/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/4385e76fe3b57cdc2307fee7eaf165b2/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/464af965fc103fba8d5107992ee258d7/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/46c5849e08b837b4db7b0e14ac3da4bf/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/471ecb5e41eee93b71bdedcbfe765082/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/4ecf49bd8a2bd73236610ae7baad94cd/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/4f2093c9d25852c8f1937ae5a47b99a6/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/5314739887d73f74e423711cab65391b/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/53a2359c2945899f00141e65dbed4e55/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/55b6d393cd5570f9958d1cedfecab64b/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/5618afb4b1ed6fddd776c69a8e66ca5f/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/58c2e4c84ee068d5bd50ca152d1acaa7/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/594754de90ec0b807229f9c985289530/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/5bfc696a447f419d14b94ad348c2d91c/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/5fbd95b73afe9965d4f3109223831dd3/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/61597432632bf90678b7132db0451f45/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/61be66f63866a0fe08210d0561339d2b/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/64989b91c66fe6d4311a9f8424470a98/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/65045efbc4fd241df5fd030a025c6ed0/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/6595eb191aaec844eba1b630b85cddb6/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/65a8f31988a610fca44908622efededf/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/65aa844bb82a67272629b58dbc38a8b9/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/668bcd39358d58808aa69bebb5f66be2/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/66c6fd654c3a5f8bbc694b1dff3ac39d/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/6896b2782bf5046a867487cbb75f9663/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/6aa03c56d44e23ea54ea940eb6caedc8/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/6d5f397660c6ec7a445f386edac05b9e/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/75ce3277e2f92cec639305da4858a384/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/78d33d56886dd619e20b68029ecd4cae/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/7ed64b3c64416c6d3bb403100c13120b/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/834cdcc7aae684417e0c619648814593/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/836a8c66bb7337ba74c71e9549bccf63/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/852371e079ada96e46d3f027b6b2dfd4/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/857aac388ff6e3e973ccb2601fd9b178/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/89d0501ef77b7785f2838a40d4ddc4e4/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/8a2826d15c8b40472bc32f7b9505340a/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/8eba5b939999fbd0172cbf665b6073cc/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/989f9ba21bb1c9cf946c975fbb146ab7/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/9cf115efcd856c8bd274c7f19b045e52/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/a000cacfed458775813ba03605d01818/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/a2cb3ba69c12f55200b19d8cf55a6352/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/add4eecf4224fe2341d55c06e13c096a/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/adefe8c18cb297c39c8be105c1b48fe5/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/b04d0e1c1ba0bd1b3027a276a21dee01/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/b0e17be162f5800159a107bc3ac01aa5/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/b579704ca50e0c73bf240c18dd553fc1/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/b67bc00e2ea4559fdfd3d34b76d9c12e/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/b6da72119ee668ebbd2e834ea18425d8/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/bbbf0ca77b7a1e250e3e1fb9f9c3cd66/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/bbd779769387feb8006ee5d6676877a1/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/bbfbf2af844af5be07903f05319db359/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/bd5cf168c66b339b0026d83e030e86dc/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/bfcc4fdda18be0e2f6fecc3aeebebe6c/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c0cade8e4d2c714a00191d45882f9d32/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c4ae667b0e909274ee408dd0712e6ae2/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c538e602c73206b9ef526250a64ce391/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c784e7a6ac9bba199a8f7f90249cdd7d/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c7dfd91c489c7798443e50b86f97242c/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c950331456d1f19a6ac8b1645f142184/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c9f37d9ef898ea29bb146f3397868745/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/cca71419fd1ba5e4c10024df03ac2c44/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/cd159e1991233a9a25fe0724321f5bb6/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/ce293de53f905a3ce444062ec5242d53/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/d05a918feff44839c3a3eafda8986589/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/d2376e34b073e12ad585607e80b43091/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/d38ce2b77f8fd3f39224fe8474cacb92/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/d54f88aa3918b81af5d42eb683b2246a/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/d6b738c64650ac1d5b73ca476b9198d3/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/db00c3cd8cf4d0875cf1b8c490780dac/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/de3fcfa0feb19e775358e5f6780d6098/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/de7e96b0de5bf2ce80c49a1553fc040b/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/dee68406b35e37da1b5ed69777654fa0/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/e02ba550731c3305177fd0f4b2df3d11/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/e3d636dc4a0c059da0496417ffea7e6c/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/e4a77ce7d6781682afb716d21c0a6e3b/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/e737a35fb2ad2272f8ad0bd717631ebe/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/ea7ca97848f7f224a3849341a2b623ce/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/eaf29392322f832fdb26bc52e669938f/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/ec286a03bd12dbb15c22b897c20eadff/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/f191eea008b572b2dcffff1ea961eea4/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/f22d661ecf3fa73ccae43e8b54efec15/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/f2b2162f594c0ba107591f1e31fe552b/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/f2b9b1585d38b637d884370b65141973/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/f7b774a90778e1e7915dd012cda5d7e0/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/f9cea464d329ee6e3c5d17ee1c1fbcf3/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/fa1ce80a8e4cc65e2dc54d5098ee1065/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/fb22a75aa1aafc992230abd0bd79faef/500x500-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/fb6a42245d60c18999c0eb1a49d1a697/500x500-000000-80-0-0.jpg",
];

// Fisher–Yates shuffle (returns a new shuffled copy, doesn't mutate input).
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function IntroPage() {
  const navigate = useNavigate();

  // Shuffle once per mount so each visit gets a different cover order without
  // re-shuffling on every render.
  const albums = useMemo(() => shuffle(INTRO_COVERS), []);

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

  // Build columns — each column gets its own offset into the shuffled list and
  // duplicates the slice so the scroll loops seamlessly.
  const [columnCount, setColumnCount] = useState(() =>
    typeof window !== "undefined" ? Math.ceil(window.innerWidth / 160) : 8
  );
  useEffect(() => {
    const onResize = () => setColumnCount(Math.ceil(window.innerWidth / 160));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const columns = [];
  for (let i = 0; i < columnCount; i++) {
    const offset = (i * 7) % albums.length;
    const rotated = [...albums.slice(offset), ...albums.slice(0, offset)];
    columns.push({ covers: [...rotated, ...rotated], direction: i % 2 === 0 ? "up" : "down" });
  }

  return (
    <div className="intro-page">
      {/* Moving cover-wall background. */}
      <div className="intro-albums-bg">
        {columns.map((col, i) => (
          <div
            key={i}
            className={`intro-album-col ${col.direction === "up" ? "scroll-up" : "scroll-down"}`}
          >
            {col.covers.map((cover, j) => (
              <div key={j} className="intro-album-tile">
                <img src={cover} alt="" draggable={false} loading="lazy" />
              </div>
            ))}
          </div>
        ))}
      </div>

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
