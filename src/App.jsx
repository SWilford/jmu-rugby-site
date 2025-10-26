// src/App.jsx
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import About from "./pages/About";
import Schedule from "./pages/Schedule";
import Team from "./pages/Team";
import Roster from "./pages/Roster";
import Coaches from "./pages/Coaches";
import Media from "./pages/Media";
import Join from "./pages/Join";
import Donate from "./pages/Donate";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

/*export default function App() {
  return (
    <>
      <Navbar />
      <main className="bg-jmuPurple text-jmuLightGold font-arvo grow flex flex-col items-center pb-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/team" element={<Team />} />
          <Route path="/media" element={<Media />} />
          <Route path="/join" element={<Join />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}*/

export default function App() {
  return (
    <div className="flex flex-col min-h-screen bg-jmuPurple text-jmuLightGold font-arvo">
      <Navbar />
      {/* Hard Gentlemen */}
      <main className="flex-1 flex flex-col items-center pb-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/team" element={<Team />} />
          <Route path="/media" element={<Media />} />
          <Route path="/join" element={<Join />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
