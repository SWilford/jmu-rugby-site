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
    <header className="bg-jmuPurple text-jmuGold font-arvo">
      {/* top bar */}
      <div className="max-w-6xl mx-auto flex justify-start items-center px-6 py-2 text-sm text-jmuLightGold">
        <a
          href="https://www.instagram.com/jmumensrugby/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:text-jmuGold transition"
        >
          <FaInstagram size={18} />
        </a>
        <a href="https://www.facebook.com/JMURugby/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 ml-2 hover:text-jmuGold transition"
        >
          <FaFacebook size={18} />
        </a>
      </div>

      {/* logo + title row */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-center sm:justify-start px-6 py-6 border-b border-jmuDarkGold">
        <img
          src={logoGold}
          alt="JMU Rugby Logo"
          className="h-28 w-auto object-contain mb-4 sm:mb-0 sm:mr-6"
        />
        <div className="text-center sm:text-left leading-tight">
          <h1 className="text-6xl font-bold text-jmuGold tracking-tight">
            JMU Men’s Rugby
          </h1>
          <p className="uppercase tracking-widest text-jmuLightGold text-lg mt-1">
            Fifteen • As • One
          </p>
        </div>
      </div>

      {/* nav bar */}
      <nav className="bg-jmuPurple">
        <div className="max-w-6xl mx-auto border-b border-jmuDarkGold">
          <div className="flex flex-wrap items-center justify-center sm:justify-start px-6">
            {links.map(([label, path], i) => (
              <div key={label} className="flex items-center">
                <NavLink
                  to={path}
                  className={({ isActive }) =>
                    `text-lg font-semibold px-4 py-2.5 rounded-sm transition-colors duration-200 ${
                      isActive
                        ? "text-jmuPurple bg-jmuGold"
                        : "text-jmuLightGold hover:text-jmuPurple hover:bg-jmuGold"
                    }`
                  }
                >
                  {label}
                </NavLink>
                {i < links.length - 1 && (
                  <span className="h-5 border-l border-jmuDarkGold mx-2" />
                )}
              </div>
            ))}

            <div className="ml-0 sm:ml-auto py-2 sm:py-0 sm:pl-4">
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `inline-flex rounded border px-3 py-1.5 text-sm font-semibold transition-colors duration-200 ${
                    isActive
                      ? "border-jmuGold bg-jmuGold text-jmuPurple"
                      : "border-jmuLightGold text-jmuLightGold hover:border-jmuGold hover:bg-jmuGold hover:text-jmuPurple"
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
