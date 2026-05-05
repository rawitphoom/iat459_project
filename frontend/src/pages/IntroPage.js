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
  "https://cdn-images.dzcdn.net/images/cover/5bf6a2d836429e215be5f0213882ad1f/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/0c424dbe627530cd06a6fd408baba3f3/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/b0c86b4720b7ccf37750d466e18b981e/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/7bb0b356418fbb275c0c3db7259128d7/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/96f16ccb3da4d231b72bc5de25a16202/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/5e7b8670b572a110d4453e6ac94421d8/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/48dd98d88f1af797d65faf7f3e4beef7/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/fd00ebd6d30d7253f813dba3bb1c66a9/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/478a544d29275755b3b8f7b4a1fd7a3c/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/0f834188957ef50cb73c9db3115a7827/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/5718f7c81c27e0b2417e2a4c45224f8a/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/311bba0fc112d15f72c8b5a65f0456c1/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/b870579c8650cd59b1cce656dde2ef17/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/00dd0da365a94b1829302d6b7fec70e6/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/7ce6b8452fae425557067db6e6a1cad5/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/b5be27644d505bad7bdb516fe4165475/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/412361ce41f0bd2595978dbf0e035ad3/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/041ab5ceb6fb6ebf9512966835be9e1b/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/a7a16b8f63b1ec0e9fbd327619966737/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/2d740784396546039fe626ac2b92877b/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/cb415a59a7bc198ec4aab01f02600691/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/00343d3c01974b351e837bdeadd67945/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/351715f1ce58dca4e5088fe40acaa6cb/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/34cd5be5dbedbf061566eb976614c25d/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/3583e424251d6094b96f965c8eabb844/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/b899e98957cab00d900ada4611c39f7f/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/8919eee2a1ffe50f8eee6807db7192be/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/494fdb6075864c792809c7d9b24d6417/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/9eb3062eebc26c7a131ad6984f53137c/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/2997ab06ce41e0f172ae8033259daf53/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/8213a3ed562b9e9eb33660fc34b706d2/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/4fca2bc6ebaacc930e9bc95a61b31623/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/6dfa4ea965a74b93870a85daa74b7ca3/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/f4a97176825a598ab5351f69822e9457/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/941d45a4053e55a13bc2c55e7f72de1e/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/3b60918205a5bb30e2b2427714ec3162/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/2f152c3d4d7a7e607e985d77339af1de/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/a1a3326c5d9176c763fc3fd847b86681/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/a3c3b409f0d5bd781821ec0fd79d5b15/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/6630083f454d48eadb6a9b53f035d734/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/bb2880548dd3bc71fb97def2eedec130/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/4c2c6143c3e83a01ea73517c57d1d138/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c0f4f022fa51f13e877aae2e758e241d/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/b68adb6788dfa09a314f594aec287850/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/0ae53c84250981214bcb7ca39f8c2195/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/64e54e307bd5e2bdb27ffeb662fd910d/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/b223decfaa57910ef709736e49eaf0de/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/f7a0a1ca91431861989efe5a22aad557/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/700f0375d5ac8570f16a2c7eb128303f/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/f8a0a2e1ec12c1026cd03208237cd934/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/a175af9b7d329bc678cb4d26fc13d6de/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/05a186e0a859a36f9cd51cdae2158fe1/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/e5925065cdb1cefbc3bd75af4a1f1801/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/9732751ce91d786dcf30069853697078/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/e635a8510c1a74bc089b3566ebbb9cb8/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/cb029c785b8d0cd624ddee9d4127ceff/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c26e4c98fcf7ba68c2a77668f092ac08/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/19b162314851dc4325d9de81663eb59a/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/122fd1b9f6498e9fb8e1c148926a7d55/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/63ff8d3ecdf658d156d34d40058442c1/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/36aecc47636b326efc3987120dcf4c65/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/63593ab6be8e57a118b9b53784eda751/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c600c9333fec238b7ac9ee691817f7cc/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/6029bd790f31c5112f62c352adb27572/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/76a887908b2b4491f06193cea0b4551d/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/36b361c2c916b333a0b7c6f949c32099/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/ac9324c12054d39cba9da1d04ac5c71d/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/bd132a0670b07c6aadc4a7ee0efc8f6f/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/2af56dee5db12e4af6323afa26257ccf/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/1457f0d27076538d484625fa706541b7/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/470b179cc499f76813311609e4e3b9b9/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/aee106a0dc2eba379ae92998e51fe3d3/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/57ae3715e73c0486616bab8c2d6c6159/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/a07c38caadefae99abe4047dbcb0c778/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/66ae12120936d9660d3e30a7db7627b8/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/10440b4fc8b5b8f3392702a2ef213ab1/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/767ed9448afc5f293cd951da92ae5b3d/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/4bd6b0232c2092faf145101453cb1051/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/122a6ace3852ad75a05aa435d17b38b3/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/76f4c6ec0218b725a57390efeba5e6aa/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/2cc429d96d3b86aa2f58c4ccf1c942a5/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/7037869230e2fbf86b91ec1b4c7e8b8d/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/0a035b7aa9478337c283d121c02537c5/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/ebc00d27806825921c1621278160ec10/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/c36d43e83edce2aebe1a0624c9b2bcdf/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/28c2fba857ca1b5c0b23daf510863742/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/1b7d1aafad25fa6af40ed8c920d23769/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/f0d5207d075adb652643a29ae8851e7b/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/f2edcff8208b6c8aeb2dccff39209043/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/fafe4321f7d95339e3ca938f03784df8/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/67e9a8272d715c88adf400c554f68f33/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/de9e79511cda59914de9add50946e43c/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/f2315bc78a1049916d387cd23feeb3ee/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/f8364f090ba04f1b19b381ec0390f3e4/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/346c524c15ecccbc4a8a78e8972a352c/1000x1000-000000-80-0-0.jpg",
  "https://cdn-images.dzcdn.net/images/cover/b0e936124f59e669ddba02ebe5893f95/1000x1000-000000-80-0-0.jpg",
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
