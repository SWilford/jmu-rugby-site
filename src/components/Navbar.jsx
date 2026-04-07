import { useEffect, useState } from "react";
import { FaFacebook, FaInstagram } from "react-icons/fa";
import logoGold from "../assets/jmu-gold-logo.png";
import { NavLink } from "react-router-dom";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const links = [
    ["Home", "/"],
    ["About", "/about"],
    ["Schedule", "/schedule"],
    ["Team", "/team"],
    ["Media", "/media"],
    ["Join", "/join"],
    ["Donate", "/donate"],
    ["Contact", "/contact"],
  ];

  return (
    <header
      className={`glass-nav sticky top-0 z-40 text-jmuGold font-arvo shadow-[0_8px_24px_rgba(15,0,32,0.25)] transition-all duration-300 ${
        isScrolled ? "nav-scrolled" : ""
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-2 text-sm text-jmuLightGold sm:px-6">
        <div className="flex gap-2">
          <a
            href="https://www.instagram.com/jmumensrugby/"
            target="_blank"
            rel="noopener noreferrer"
            className="social-orb inline-flex h-8 w-8 items-center justify-center rounded-full bg-jmuPurple/25 transition hover:bg-jmuGold/20 hover:text-jmuGold"
            aria-label="JMU Men's Rugby Instagram"
          >
            <FaInstagram size={16} />
          </a>
          <a
            href="https://www.facebook.com/JMURugby/"
            target="_blank"
            rel="noopener noreferrer"
            className="social-orb inline-flex h-8 w-8 items-center justify-center rounded-full bg-jmuPurple/25 transition hover:bg-jmuGold/20 hover:text-jmuGold"
            aria-label="JMU Men's Rugby Facebook"
          >
            <FaFacebook size={16} />
          </a>
        </div>
        <NavLink
          to="/admin"
          className="text-xs uppercase tracking-wider text-jmuLightGold/70 transition hover:text-jmuGold hover:underline underline-offset-4"
        >
          Admin Login
        </NavLink>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center border-y border-jmuDarkGold/40 px-5 py-6 sm:flex-row sm:justify-start sm:px-6">
        <img
          src={logoGold}
          alt="JMU Rugby Logo"
          className="brand-crest mb-3 h-20 w-auto object-contain sm:mb-0 sm:mr-5 sm:h-24 transition-transform duration-300 hover:scale-105"
        />
        <div className="text-center leading-tight sm:text-left">
          <h1 className="site-title text-4xl font-bold tracking-tight text-jmuGold sm:text-5xl lg:text-6xl drop-shadow-lg">
            JMU Men's Rugby
          </h1>
          <p className="mt-2 text-xs uppercase tracking-[0.35em] text-jmuLightGold/90 sm:text-sm drop-shadow-md">
            Fifteen | As | One
          </p>
        </div>
      </div>

      <nav className="bg-transparent">
        <div className="mx-auto w-full max-w-6xl px-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 py-4 sm:justify-start">
            {links.map(([label, path]) => (
              <NavLink
                key={label}
                to={path}
                className={({ isActive }) =>
                  `nav-link-chip rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide transition-all duration-300 sm:text-base border border-transparent ${
                    isActive
                      ? "is-active bg-jmuGold text-jmuPurple shadow-[0_4px_12px_rgba(203,182,119,0.3)] border-jmuGold"
                      : "text-jmuLightGold hover:bg-jmuGold/10 hover:text-jmuGold hover:border-jmuGold/30"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}
