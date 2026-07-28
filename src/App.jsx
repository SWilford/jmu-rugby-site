// src/App.jsx
import { useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import About from "./pages/About";
import Schedule from "./pages/Schedule";
import Team from "./pages/Team";
import Media from "./pages/Media";
import Join from "./pages/Join";
import Donate from "./pages/Donate";
import Contact from "./pages/Contact";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const SITE_URL = "https://www.jmumensrugbyclub.com";

const routeSeo = {
  "/": {
    title: "JMU Men's Rugby Club",
    description: "Official site for JMU Men's Rugby Club with match schedule, roster, media, and join details.",
  },
  "/about": {
    title: "About | JMU Men's Rugby Club",
    description: "Learn about JMU Men's Rugby Club, our mission, and what drives our program.",
  },
  "/schedule": {
    title: "Schedule | JMU Men's Rugby Club",
    description: "View the latest JMU Men's Rugby Club match schedule and upcoming fixtures.",
  },
  "/team": {
    title: "Team | JMU Men's Rugby Club",
    description: "Meet the JMU Men's Rugby Club roster and coaching staff.",
  },
  "/media": {
    title: "Media | JMU Men's Rugby Club",
    description: "Explore photos and media highlights from JMU Men's Rugby Club.",
  },
  "/join": {
    title: "Join | JMU Men's Rugby Club",
    description: "Interested in joining? See how to become part of JMU Men's Rugby Club.",
  },
  "/donate": {
    title: "Donate | JMU Men's Rugby Club",
    description: "Support JMU Men's Rugby Club with a donation.",
  },
  "/contact": {
    title: "Contact | JMU Men's Rugby Club",
    description: "Contact JMU Men's Rugby Club for recruiting, scheduling, and general inquiries.",
  },
  "/admin": {
    title: "Admin | JMU Men's Rugby Club",
    description: "Administrative access for JMU Men's Rugby Club site management.",
    noindex: true,
  },
};

const upsertHeadTag = (selector, createTag) => {
  const existingTag = document.head.querySelector(selector);
  if (existingTag) return existingTag;
  const tag = createTag();
  document.head.appendChild(tag);
  return tag;
};

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
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}*/

export default function App() {
  const location = useLocation();
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const seo = routeSeo[location.pathname] || {
      title: "JMU Men's Rugby Club",
      description: "Official site for JMU Men's Rugby Club.",
      noindex: true,
    };

    const canonicalUrl = `${SITE_URL}${location.pathname === "/" ? "" : location.pathname}`;

    document.title = seo.title;

    const descriptionTag = upsertHeadTag('meta[name="description"]', () => {
      const tag = document.createElement("meta");
      tag.setAttribute("name", "description");
      return tag;
    });
    descriptionTag.setAttribute("content", seo.description);

    const robotsTag = upsertHeadTag('meta[name="robots"]', () => {
      const tag = document.createElement("meta");
      tag.setAttribute("name", "robots");
      return tag;
    });
    robotsTag.setAttribute("content", seo.noindex ? "noindex, nofollow" : "index, follow");

    const canonicalTag = upsertHeadTag('link[rel="canonical"]', () => {
      const tag = document.createElement("link");
      tag.setAttribute("rel", "canonical");
      return tag;
    });
    canonicalTag.setAttribute("href", canonicalUrl);

    const ogUrlTag = upsertHeadTag('meta[property="og:url"]', () => {
      const tag = document.createElement("meta");
      tag.setAttribute("property", "og:url");
      return tag;
    });
    ogUrlTag.setAttribute("content", canonicalUrl);
  }, [location.pathname]);

  useEffect(() => {
    let rafId = null;

    const updateScrollProgress = () => {
      rafId = null;
      const documentElement = document.documentElement;
      const scrollableHeight = documentElement.scrollHeight - window.innerHeight;
      const progress = scrollableHeight <= 0 ? 0 : Math.min(window.scrollY / scrollableHeight, 1);
      setScrollProgress(progress);
    };

    const queueUpdate = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(updateScrollProgress);
      }
    };

    queueUpdate();
    window.addEventListener("scroll", queueUpdate, { passive: true });
    window.addEventListener("resize", queueUpdate);

    return () => {
      window.removeEventListener("scroll", queueUpdate);
      window.removeEventListener("resize", queueUpdate);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <div className="site-shell flex min-h-screen flex-col text-jmuLightGold font-arvo">
      <div className="scroll-progress" aria-hidden="true">
        <span
          className="scroll-progress-value"
          style={{ transform: `scaleX(${scrollProgress})` }}
        />
      </div>
      <Navbar />
      <main className="flex flex-1 flex-col items-center pb-6 sm:pb-8">
        <div key={location.pathname} className="route-stage">
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/team" element={<Team />} />
            <Route path="/media" element={<Media />} />
            <Route path="/join" element={<Join />} />
            <Route path="/donate" element={<Donate />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
      <Footer />
    </div>
  );
}
