// src/components/Navbar.jsx
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="sticky top-0 bg-white border-b">
      <nav className="max-w-5xl mx-auto px-4 py-3 flex gap-4 flex-wrap">
        <Link to="/" className="font-bold">JMU Rugby</Link>
        <Link to="/about">About</Link>
        <Link to="/schedule">Schedule</Link>
        <Link to="/team">Team</Link>
        <Link to="/media">Media</Link>
        <Link to="/join">Join</Link>
        <Link to="/donate">Donate</Link>
        <Link to="/contact">Contact</Link>
      </nav>
    </header>
  );
}
