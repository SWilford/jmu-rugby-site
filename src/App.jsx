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

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const animatedSelector = [
      ".hero-banner",
      ".surface-card",
      ".surface-card-soft",
      ".data-table tbody tr",
      ".footer-panel",
      ".sponsor-item",
    ].join(", ");

    let revealIndex = 0;
    let registerRaf = null;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );

    const registerAnimatedElements = () => {
      document.querySelectorAll(animatedSelector).forEach((element) => {
        if (element.dataset.revealRegistered === "true") return;
        element.dataset.revealRegistered = "true";
        element.style.setProperty("--reveal-order", `${revealIndex % 8}`);
        revealIndex += 1;
        element.classList.add("reveal-on-scroll");
        observer.observe(element);
      });
    };

    const queueRegister = () => {
      if (registerRaf !== null) return;
      registerRaf = window.requestAnimationFrame(() => {
        registerRaf = null;
        registerAnimatedElements();
      });
    };

    queueRegister();
    const mutationObserver = new MutationObserver(queueRegister);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
      if (registerRaf !== null) {
        window.cancelAnimationFrame(registerRaf);
      }
    };
  }, [location.pathname]);

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
