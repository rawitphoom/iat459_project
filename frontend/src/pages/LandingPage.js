import { useNavigate } from "react-router-dom";

// Static album data — no API calls, loads instantly every time
const ALBUMS = [
  { id: 6575789, title: "In Rainbows", cover: "https://cdn-images.dzcdn.net/images/cover/311bba0fc112d15f72c8b5a65f0456c1/500x500-000000-80-0-0.jpg" },
  { id: 6032550, title: "Channel Orange", cover: "https://cdn-images.dzcdn.net/images/cover/951c831f76dac672dc9e7ea1c8bb6e7d/500x500-000000-80-0-0.jpg" },
  { id: 1527551, title: "The Life of Pablo", cover: "https://cdn-images.dzcdn.net/images/cover/b9ea1cd9997b0373d05bfbb6d3cbb111/500x500-000000-80-0-0.jpg" },
  { id: 86286, title: "Issues", cover: "https://cdn-images.dzcdn.net/images/cover/556212f5b16ffd34de4df816635e40fc/500x500-000000-80-0-0.jpg" },
  { id: 103248, title: "Flower Boy", cover: "https://cdn-images.dzcdn.net/images/cover/ec3c8ed67427064c70f67e5815b74cef/500x500-000000-80-0-0.jpg" },
  { id: 11483918, title: "Blonde", cover: "https://cdn-images.dzcdn.net/images/cover/cc8c4d579339b57051b6cf1c9fe1944d/500x500-000000-80-0-0.jpg" },
  { id: 75621062, title: "DAMN.", cover: "https://cdn-images.dzcdn.net/images/cover/8b8fc5d117f9357b79f0a0a410a170e8/500x500-000000-80-0-0.jpg" },
  { id: 1109731, title: "Discovery", cover: "https://cdn-images.dzcdn.net/images/cover/4a1f40fe1ef2d6244ed9fc094cb4fa35/500x500-000000-80-0-0.jpg" },
  { id: 13529009, title: "Random Access Memories", cover: "https://cdn-images.dzcdn.net/images/cover/4ee76930f419959acb2fcafce894ea71/500x500-000000-80-0-0.jpg" },
  { id: 7103854, title: "good kid, m.A.A.d city", cover: "https://cdn-images.dzcdn.net/images/cover/e1151fb1cd2be03bc859618515f44327/500x500-000000-80-0-0.jpg" },
  { id: 302127, title: "OK Computer", cover: "https://cdn-images.dzcdn.net/images/cover/5718f7c81c27e0b2417e2a4c45224f8a/500x500-000000-80-0-0.jpg" },
  { id: 1016399, title: "Currents", cover: "https://cdn-images.dzcdn.net/images/cover/4b06ec4a3f725ebe065a9bbcc61d0483/500x500-000000-80-0-0.jpg" },
];

export default function LandingPage() {
  const navigate = useNavigate();

  const count = ALBUMS.length;
  const angleStep = 360 / count;
  const radius = 460;

  return (
    <div className="landing">
      {/* 3D rotating album ring — top section */}
      <div className="landing-ring-wrapper">
        <div className="landing-ring">
          {ALBUMS.map((album, i) => (
            <div
              key={album.id}
              className="landing-ring-item"
              style={{
                transform: `rotateY(${i * angleStep}deg) translateZ(${radius}px)`,
              }}
              onClick={() => navigate(`/album/${album.id}`)}
            >
              <img src={album.cover} alt={album.title} />
            </div>
          ))}
        </div>
      </div>

      {/* Text + button — bottom section */}
      <div className="landing-bottom">
        <h1 className="landing-main-title">MIXTAPE</h1>
        <p className="landing-tagline">
          Discover new music and revisit favorites.<br />
          Build a collection that feels truly yours.
        </p>
        <button
          className="landing-cta"
          onClick={() => navigate("/register")}
        >
          GET STARTED ↗
        </button>
      </div>
    </div>
  );
}
