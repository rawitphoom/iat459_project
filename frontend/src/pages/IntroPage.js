import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Hard-coded Deezer cover URLs for the intro backdrop. Avoids the slow
// /api/music/chart call so the splash renders instantly. Shuffled per load
// so the layout still feels random.
const INTRO_COVERS = [
  "https://cdn-images.dzcdn.net/images/cover/569b5b455a27016ba50939e53df884a2/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/a3b8e9462db0c02e082c706c624f9811/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/93a5354699d552666448e1c87c976605/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/2b7ebf336f61c1aca52c0bfec0a4b30e/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/d68fc5f1f260273691180b9f4b77b354/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/cad261eafd0c6c15811200d5039b5b50/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/336e00b554c028d58b7c432c38581997/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c2c0c949896973962d75f892f1bfab15/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/f01e09ceb8ad1e96707c1b4aadb5911b/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/91961aec2cb493fedea0f31efbd59d74/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c75d50ec71519c41a3193da456f1236b/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/5763556dd320ce7f928b4dc07f257fac/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/56ad909a8c76708060ffc09343b10231/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/42d99532153218c0c27e12f366db188d/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/346d0083673fe51a953d3a13b554edf1/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/8f240cefe084e5cb21860338fb6592bc/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/9a1084ee1062fd9cd8dbeb1a8978351d/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c383f69387e62199b90097198c4ec79e/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/866c9033f32c1bd3a65dd7e016f275e6/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/42b7a2ed706bd6b3309b0a39a73658a2/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/814316ef7a34ab242d15288c71cd0cc3/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/9117aa9c8fcd4b828bc72580da6e67fa/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/5dca87cb513184dc8b1ce88679ef8e7f/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/2eb6982c7e64d5eb95038bd56f41d365/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/b12db87a28112199b7ca7273afefee79/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/424b9acb0662ec5803a2fa55f1520757/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/89527012e81f2f5991063d46c4756a51/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/2aba5e9bae821fd309cdf660de8026d9/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/ad86e6edbcf205afcf258c3c155b7a9b/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/99c2ad72009cc67e870b8af7aedab959/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/9e9914a94384088355e49fd6eaabb688/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/9a7d738484f8b0d4240770a538fd4b91/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/06024a909553e0f2ec76c0da1628cdda/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/18cd55bd2f4d4c551f24fe2e129a06fb/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/50e93fece1d380eae198cb481c884cb7/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/41f279c3ae7bb639403c1ec0713e5e24/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/8470aab7f1ff49ea37dd02fcb8b77337/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/5c664f8bef4db89b81c8c615207ec4e9/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/b181b1871e57fb1f7273b43343941766/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/45a424758acc5e39a551cf6b9776ccef/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c6dc41208e41bf0739cb2f14b65f16d8/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/a3a5690b75d3b43e3b676d7e33ccb111/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/e9db1ae6024a4d542bc0de127f5eef43/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/ad21d7a58f177a7908a16fe3902b59a8/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/4d8a5a7fd799672758f1c03a22367a8e/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/8d0164d7161ac43452ec58201e56e3a4/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/ff0bc75612255a88fc634a8406a052aa/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/8f9c6877afc1b4c4d8c388e116b0cbd9/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/539326a956f71e80b464a8d497d0c0b9/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/58ad818ffe3fa1152cf770126544879f/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/face0ef887522f27329084aeb25056f0/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/4f31cb4d11d8706a3d6b9c5b6e676c9d/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/e66f050338129ddd32ca01eb24f9ab2e/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/77206f49b263cd8845c2a03ce68e4368/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/76a887908b2b4491f06193cea0b4551d/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/282e45bef1995c2c6f2901e34c4ab560/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c61b4c3bc029d351f4e69be4c4d0a5e4/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/250509ad1011a469bfd366f758f2f665/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/b153fa780570048fc3e320223bdd9b2c/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/9ce399fb0bf7249d453964334f8811c7/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/ea82c301fdba93fca82af314af3d2593/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/9629ae22129d0f106318540e9e88de5a/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/bc2596a6f6ff8f1c77f642805aca2e40/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/cd1317271599a209852132cdc70009e4/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/8b2d3be63866daf31902865f99f8b332/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/5d0a8b5bd77f284377831d68e8374a9d/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/3cc6df5c0e0333dd442f836cf5078b41/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/29ab41e3c272d79340ab0931d72f6c19/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/3cdc3b80eeb212b6775223081bd26d2c/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/14b4c30f4d3e7abab606a4b51e807279/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/976da86e71e0dd5a8319a58ece8de443/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c2973815468d00266af1252d5c137b22/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/5772b495f0dcdf660d0fc88c4c38a3fa/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/922d6979a91ce20e45e65c860b8eca45/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/9e75dfe38f0e3310b94c412aa7336ed2/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/df255a66bf63665d2e9569b5a29274f6/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/a07e2237f6b45a9d5d54ca29712eb2a2/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/9e5a32f2e9c7c8c35f0350bd8e6bd8dc/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/6e00f3c1c503774e49acd39955b3dcba/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/3dc9e44a9bbd3fc6d96ea25849e6354c/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/439382ad824a74b2ee2da37cf84f40a1/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/e416c42fa965cc7459ddc71494a9f020/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/43e5153237dcedee6ec6e6143002b456/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/8c119d3dd5f6574fb27c0eec5eb6f2e9/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/7055bf2165f78de8d806989d47c778fe/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/0ca326cf32f85065817da66c4ab139b5/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/bb531a2f1f684e02fee5ed5a2217c34e/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/59bc09c9de157574278546857c0bd33d/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/a0b05276a5231399968dffaa1a6b4cf0/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/b654bdef0c0e9c48ce4a2fd54f69e1fa/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/20388a4ea3c9db23acfebdc1e7e0e2d2/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/796facddba7f54dcf699c54b3ef5c735/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/895c8acc3bf2597a2165b03eb973dd46/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/62139d95d1424e051632edd56f013b17/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/fb86decc775f4140fdc5c9433ac1170d/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/0bae89a10d378c2b28cdfb70da101000/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/f09301d5cb0217be45620305b59dd06b/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/d1bf640f97aec1447bcff6c81ab92d90/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/df1e3dd3a90ad641912ceaa5a26ac954/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/de5b9b704cd4ec36f8bf49beb3e17ba2/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/5d284b31cb9ddeb1a0c79aede5a94e1c/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/e5925065cdb1cefbc3bd75af4a1f1801/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/6e947717dede73960b99908b7d5a1eb9/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/60d056cf3af5115b5d8e3da4e09b4adf/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c9e228763cb9a9552b1c1f71a5442809/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/427acf920d159433f06ff0c526865e20/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/d62cfe50854d4259ba2b9729e29b8496/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/7c79fc0ee163260bb6fd287364a2a233/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/200ed215e4d15cb48850a0afad64b956/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/34530496ad5fc293deffd38dd91963ce/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/4e52fe03f9e7c7d8a55e963252ca623e/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c72d99da34a2335bf61bcacc0ee4a2f1/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/e81bdb5b56012bbee8ac43b4b3552025/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/da4eba19f6bc5082f46b2b330d9552b6/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/d07329fd5f9b346e5b19f0d028b25dc3/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/9cce2a097bb4e8e7300e3830a4fd6361/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c72e7cab03e497eb005c3490f3be703d/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/dafa8b85a975fb116feb1a2143a48cb7/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/139b7f21bd770adf219b28a529f4e0bf/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/78c24c0c33797e88d3bb1aea7eb1cfa7/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/9a00870420e4f0a347f620f749f3561a/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/24a42d4ba1b4b03b9aedd55a688093f9/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/b4dd1a3a3f7a8c493777cd29c40bb895/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/59fe9ad9f9e997f67bfa64c7cc6c11f5/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/3bc8532d88e91e5cddb889ad2f2c818d/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/d77f91377eeacc9791b1f500de615bd1/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/7ea7c936105b6084bf556e11f6d3751a/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/31c0fa15d688211ad52334d07b6a18fa/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/59e4be0eeff2e34f03b4e06d4d8a3df1/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/23b006b2e956536d97612847bbd7a3b7/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/fb25920db2a9929db8893d7322161cde/1000x1000-000000-80-0-0.jpg",
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
