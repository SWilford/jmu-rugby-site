import { FaFacebook, FaInstagram } from "react-icons/fa";
import logoGold from "../assets/jmu-gold-logo.png";
import { NavLink } from "react-router-dom";

export default function Navbar() {
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
    <header className="glass-nav sticky top-0 z-40 text-jmuGold font-arvo shadow-[0_8px_24px_rgba(15,0,32,0.25)]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-start gap-1 px-4 py-2 text-sm text-jmuLightGold sm:px-6">
        <a
          href="https://www.instagram.com/jmumensrugby/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-jmuDarkGold/60 bg-jmuPurple/25 transition hover:border-jmuGold hover:bg-jmuGold/15 hover:text-jmuGold"
          aria-label="JMU Men's Rugby Instagram"
        >
          <FaInstagram size={18} />
        </a>
        <a
          href="https://www.facebook.com/JMURugby/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-jmuDarkGold/60 bg-jmuPurple/25 transition hover:border-jmuGold hover:bg-jmuGold/15 hover:text-jmuGold"
          aria-label="JMU Men's Rugby Facebook"
        >
          <FaFacebook size={18} />
        </a>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center border-y border-jmuDarkGold/85 px-5 py-5 sm:flex-row sm:justify-start sm:px-6">
        <img
          src={logoGold}
          alt="JMU Rugby Logo"
          className="mb-3 h-20 w-auto object-contain sm:mb-0 sm:mr-5 sm:h-24"
        />
        <div className="text-center leading-tight sm:text-left">
          <h1 className="text-4xl font-bold tracking-tight text-jmuGold sm:text-5xl lg:text-6xl">
            JMU Men's Rugby
          </h1>
          <p className="mt-1 text-sm uppercase tracking-[0.3em] text-jmuLightGold sm:text-base">
            Fifteen | As | One
          </p>
        </div>
      </div>

      <nav className="bg-transparent">
        <div className="mx-auto w-full max-w-6xl border-b border-jmuDarkGold/90 px-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-center gap-2 py-3 sm:justify-start">
            {links.map(([label, path], i) => (
              <div key={label} className="flex items-center gap-2">
                <NavLink
                  to={path}
                  className={({ isActive }) =>
                    `rounded-full border px-4 py-2 text-sm font-semibold tracking-wide transition-all duration-200 sm:text-base ${
                      isActive
                        ? "border-jmuGold bg-jmuGold text-jmuPurple shadow-[0_7px_16px_rgba(203,182,119,0.28)]"
                        : "border-jmuDarkGold/65 bg-jmuPurple/25 text-jmuLightGold hover:border-jmuGold hover:bg-jmuGold hover:text-jmuPurple"
                    }`
                  }
                >
                  {label}
                </NavLink>
                {i < links.length - 1 && (
                  <span className="hidden h-5 border-l border-jmuDarkGold/70 sm:block" />
                )}
              </div>
            ))}

            <div className="ml-0 py-1 sm:ml-auto sm:pl-3">
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `inline-flex rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "border-jmuGold bg-jmuGold text-jmuPurple"
                      : "border-jmuLightGold/85 bg-jmuPurple/35 text-jmuLightGold hover:border-jmuGold hover:bg-jmuGold hover:text-jmuPurple"
                  }`
                }
              >
                Admin Login
              </NavLink>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

