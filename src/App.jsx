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

export default function App() {
  return (
    <>
      <Navbar />
      <main className="bg-jmuPurple text-jmuLightGold font-arvo flex flex-col items-center min-h-screen py-10">
        <div className="bg-jmuOffWhite text-jmuPurple max-w-6xl w-full rounded-md shadow-lg border border-jmuDarkGold p-10">
          <h1 className="text-3xl font-bold text-center">content placeholder</h1>
        </div>
      </main>
      <Footer />
    </>
  );
}
