import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

import img0 from "../assets/home/image0.jpeg";
import img1 from "../assets/home/image1.jpeg";
import img2 from "../assets/home/image2.jpeg";
import img4 from "../assets/home/image4.jpeg";


const images = [img1, img4, img2, img0];

export default function Home() {
  const [current, setCurrent] = useState(0);
  const [nextMatch, setNextMatch] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 10000);

    (async () => {
      const today = new Date();
      const month = today.getMonth(); // 0-based: Jan = 0
      const year = today.getFullYear();

      let seasonPrefix;
      if (month <= 1) seasonPrefix = "spring"; // Jan or earlier
      else if (month >= 2 && month <= 5) seasonPrefix = "spring";
      else if (month >= 6 && month <= 11) seasonPrefix = "fall";

      const seasonYear = month === 11 ? year + 1 : year;
      const currentSeason = `${seasonPrefix}-${seasonYear}`;

      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("season_id", currentSeason)
        .gte("date", today.toISOString().split("T")[0])
        .order("date", { ascending: true })
        .limit(1);

      if (error) console.error("Next match fetch error:", error);
      else setNextMatch(data?.[0] || null);
    })();

    return () => clearInterval(interval);


  }, []);

  return (
    <div className="bg-jmuPurple text-jmuLightGold font-arvo flex flex-col items-center min-h-screen justify-between">
      {/* Hero Section */}
      <section className="relative w-full h-[50vh] sm:h-[60vh] flex flex-col items-center justify-center overflow-hidden mt-8 rounded-none">
        {/* Rotating background images */}
        {images.map((img, i) => (
          <img
            key={i}
            src={img}
            alt={`Slide ${i + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-2s ${
              i === current ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}

        {/* Purple overlay for text readability */}
        <div className="absolute inset-0 bg-linear-to-b from-black/50 via-jmuPurple/50 to-jmuPurple/70" />

        {/* Text overlay */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-5xl sm:text-7xl font-bold text-jmuGold mb-4 drop-shadow-md">
            JMU Men's Rugby
          </h1>
          <p className="text-2xl sm:text-3xl uppercase tracking-widest text-jmuLightGold mb-8 drop-shadow">
            Fifteen • As • One
          </p>

          <div className="flex justify-center gap-6">
            <Link
              to="/schedule"
              className="border-2 border-jmuGold text-jmuGold px-6 py-3 rounded-md font-semibold hover:bg-jmuGold hover:text-jmuPurple transition-colors"
            >
              View Schedule
            </Link>
            <Link
              to="/join"
              className="border-2 border-jmuGold text-jmuGold px-6 py-3 rounded-md font-semibold hover:bg-jmuGold hover:text-jmuPurple transition-colors"
            >
              Join the Team
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-8 mt-8">
        <h2 className="text-2xl font-bold mb-4">About the Dukes</h2>
        <p className="leading-relaxed mb-6">
          Founded in 1976, JMU Men's Rugby is a tight knit brotherhood competing
          in the National Collegiate Rugby D1-AA division. We pride ourselves on
          grit, discipline, and a strong culture of camaraderie both on and
          off the pitch.
        </p>
        <Link
          to="/about"
          className="text-jmuPurple font-semibold hover:text-jmuGold transition-colors"
        >
          Learn More →
        </Link>
      </section>



      {/* Next Match Widget */}
      <section className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-8 mt-8">
        <h2 className="text-2xl font-bold mb-4">Next Match</h2>

        {nextMatch ? (
          <Link
            to="/schedule"
            className="block border border-jmuDarkGold rounded-md bg-jmuLightGold/10 hover:bg-jmuLightGold/30 transition-colors duration-200"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4">
              {/* Left side info */}
              <div>
                <p className="text-2xl font-bold text-jmuPurple mb-1">
                  {nextMatch.opponent}
                </p>
                <p className="text-jmuDarkGold font-medium">
                  {new Date(nextMatch.date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  • {nextMatch.home ? "Home" : "Away"} • {nextMatch.side}
                </p>
              </div>

              {/* Right side result */}
              {nextMatch.show_result && nextMatch.result && (
                <div className="mt-3 sm:mt-0">
                  <p className="text-xl font-bold text-jmuPurple">
                    {nextMatch.result}
                  </p>
                </div>
              )}
            </div>

            {/* Optional notes preview */}
            {nextMatch.notes && (
              <div className="border-t border-jmuDarkGold p-4 text-sm text-jmuPurple/90">
                <p className="italic line-clamp-2">{nextMatch.notes}</p>
              </div>
            )}
          </Link>
        ) : (
          <p className="text-jmuDarkGold italic">
            No upcoming matches — check back soon.
          </p>
        )}
      </section>

      {/* Gallery Preview */}
      <section className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-8 mt-8 mb-4">
        <h2 className="text-2xl font-bold mb-4">Gallery</h2>

        {/* TODO: Replace this static gallery with Supabase fetch */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {images.slice(0, 5).map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`Gallery ${i + 1}`}
              className="w-full h-32 sm:h-40 object-cover rounded-md border border-jmuDarkGold hover:opacity-80 transition"
            />
          ))}
        </div>

        <div className="text-center mt-6">
          <Link
            to="/media"
            className="text-jmuPurple font-semibold hover:text-jmuGold transition-colors"
          >
            View More →
          </Link>
        </div>
      </section>
    </div>
  );
}
