import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { getMediaFilePath, MEDIA_HOME_CAROUSEL_COLUMNS } from "../lib/mediaUtils";

import img0 from "../assets/home/image0.jpeg";
import img1 from "../assets/home/image1.jpeg";
import img2 from "../assets/home/image2.jpeg";
import img3 from "../assets/home/image3.jpeg";
import img4 from "../assets/home/image4.jpeg";
import img5 from "../assets/home/image5.JPG";

const MAX_CAROUSEL_IMAGES = 6;
const STATIC_CAROUSEL_IMAGES = [
  { key: "static-0", src: img0, alt: "Home carousel static image 0" },
  { key: "static-1", src: img1, alt: "Home carousel static image 1" },
  { key: "static-2", src: img2, alt: "Home carousel static image 2" },
  { key: "static-3", src: img3, alt: "Home carousel static image 3" },
  { key: "static-4", src: img4, alt: "Home carousel static image 4" },
  { key: "static-5", src: img5, alt: "Home carousel static image 5" },
];

const getStaticCarouselFallback = (count = MAX_CAROUSEL_IMAGES) =>
  STATIC_CAROUSEL_IMAGES.slice(-count).reverse();

const buildCarouselImages = (dynamicSlides = []) => {
  const dynamic = dynamicSlides.filter((slide) => Boolean(slide?.src)).slice(0, MAX_CAROUSEL_IMAGES);
  if (dynamic.length >= MAX_CAROUSEL_IMAGES) return dynamic;

  const remainingCount = MAX_CAROUSEL_IMAGES - dynamic.length;
  return [...dynamic, ...getStaticCarouselFallback(remainingCount)];
};

const parseDateOnly = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const getSideOrder = (seasonId) => {
  const isSpring = (seasonId || "").toLowerCase().includes("spring");
  return isSpring
    ? { "7s": 1, "15s": 2 }
    : { A: 1, B: 2, C: 3, Combined: 4 };
};

export default function Home() {
  const [current, setCurrent] = useState(0);
  const [nextMatches, setNextMatches] = useState([]);
  const navigate = useNavigate();
  const [featuredImages, setFeaturedImages] = useState([]);
  const [carouselImages, setCarouselImages] = useState(() =>
    getStaticCarouselFallback(MAX_CAROUSEL_IMAGES)
  );

  useEffect(() => {
    if (!carouselImages.length) return undefined;

    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % carouselImages.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [carouselImages.length]);

  useEffect(() => {
    setCurrent((prev) => (carouselImages.length ? prev % carouselImages.length : 0));
  }, [carouselImages.length]);

  useEffect(() => {
    (async () => {
      const today = new Date();
      const month = today.getMonth(); // 0-based: Jan = 0
      const year = today.getFullYear();

      let seasonPrefix;
      if (month <= 1) seasonPrefix = "spring";
      else if (month >= 2 && month <= 5) seasonPrefix = "spring";
      else if (month >= 6 && month <= 11) seasonPrefix = "fall";

      const seasonYear = month === 11 ? year + 1 : year;
      const currentSeason = `${seasonPrefix}-${seasonYear}`;

      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("season_id", currentSeason)
        .gte("date", today.toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (error) {
        console.error("Next matches fetch error:", error);
      } else if (data?.length) {
        const nextDate = data[0].date;
        const sideOrder = getSideOrder(currentSeason);
        const matchesForNextDate = data
          .filter((match) => match.date === nextDate)
          .sort((a, b) => (sideOrder[a.side] || 99) - (sideOrder[b.side] || 99));

        setNextMatches(matchesForNextDate);
      } else {
        setNextMatches([]);
      }

      try {
        let carouselColumn = "";

        for (const columnName of MEDIA_HOME_CAROUSEL_COLUMNS) {
          const { error: columnError } = await supabase.from("media").select(columnName).limit(1);
          if (!columnError) {
            carouselColumn = columnName;
            break;
          }
        }

        if (!carouselColumn) {
          setCarouselImages(getStaticCarouselFallback(MAX_CAROUSEL_IMAGES));
        } else {
          const { data: carouselRows, error: carouselError } = await supabase
            .from("media")
            .select("*")
            .eq(carouselColumn, true)
            .order("id", { ascending: false })
            .limit(MAX_CAROUSEL_IMAGES);

          if (carouselError) {
            throw carouselError;
          }

          const dynamicSlides = (carouselRows || []).map((row) => ({
            key: `media-${row.id}`,
            src: getMediaFilePath(row),
            alt: row.album ? `${row.album} carousel photo` : "JMU Rugby carousel photo",
          }));

          setCarouselImages(buildCarouselImages(dynamicSlides));
        }
      } catch (carouselError) {
        console.error("Home carousel fetch error:", carouselError);
        setCarouselImages(getStaticCarouselFallback(MAX_CAROUSEL_IMAGES));
      }

      const { data: mediaData, error: mediaError } = await supabase
        .from("media")
        .select("*")
        .eq("featured", true);

      if (mediaError) {
        console.error("Featured fetch error:", mediaError);
      } else if (mediaData?.length) {
        const shuffled = mediaData.sort(() => 0.5 - Math.random());
        setFeaturedImages(shuffled.slice(0, 6));
      }
    })();
  }, []);

  return (
    <div className="bg-jmuPurple text-jmuLightGold font-arvo flex flex-col items-center min-h-screen justify-between">
      {/* Hero Section */}
      <section className="relative w-full h-[50vh] sm:h-[60vh] flex flex-col items-center justify-center overflow-hidden mt-8 rounded-none">
        {/* Rotating background images */}
        {carouselImages.map((slide, i) => (
          <img
            key={slide.key}
            src={slide.src}
            alt={slide.alt || `Slide ${i + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-2000 ${
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
          Founded in 1974, JMU Men's Rugby is a tight knit brotherhood competing
          in the National Collegiate Rugby D1-AA division. We pride ourselves on
          grit, discipline, and a strong culture of camaraderie both on and off
          the pitch.
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

        {nextMatches.length > 0 ? (
          <Link
            to="/schedule"
            className="block border border-jmuDarkGold rounded-md bg-jmuLightGold/10 hover:bg-jmuLightGold/30 transition-colors duration-200"
          >
            {nextMatches.map((match, index) => (
              <div
                key={match.id}
                className={`${index > 0 ? "border-t border-jmuDarkGold" : ""} p-4`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div>
                    <p className="text-2xl font-bold text-jmuPurple mb-1">
                      {match.opponent}
                    </p>
                    <p className="text-jmuDarkGold font-medium">
                      {parseDateOnly(match.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      • {match.home ? "Home" : "Away"} • {match.side}
                    </p>
                  </div>

                  {match.show_result && match.result && (
                    <div className="mt-3 sm:mt-0">
                      <p className="text-xl font-bold text-jmuPurple">{match.result}</p>
                    </div>
                  )}
                </div>

                {match.notes && (
                  <div className="mt-3 pt-3 border-t border-jmuDarkGold text-sm text-jmuPurple/90">
                    <p className="italic line-clamp-2">{match.notes}</p>
                  </div>
                )}
              </div>
            ))}
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

        {featuredImages.length === 0 ? (
          <p className="text-center text-jmuDarkGold italic">
            No featured photos yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {featuredImages.map((photo) => (
              <img
                key={photo.id}
                src={getMediaFilePath(photo)}
                alt={photo.album}
                onClick={() =>
                  navigate(
                    `/media?album=${encodeURIComponent(photo.album)}&season=${photo.season_id}&photo=${photo.id}`
                  )
                }
                className="w-full h-40 sm:h-48 object-cover rounded-md border border-jmuDarkGold hover:opacity-80 hover:cursor-pointer transition"
              />
            ))}
          </div>
        )}

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
