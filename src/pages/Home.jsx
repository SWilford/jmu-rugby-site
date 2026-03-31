import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
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
      const month = today.getMonth();
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
    <div className="page-shell min-h-full justify-between pt-6 sm:pt-8">
      <section className="hero-banner relative mt-2 flex h-[52vh] w-full max-w-6xl flex-col items-center justify-center overflow-hidden rounded-2xl border border-jmuDarkGold/80 shadow-[0_18px_36px_rgba(24,0,46,0.34)] sm:h-[64vh]">
        {carouselImages.map((slide, i) => (
          <img
            key={slide.key}
            src={slide.src}
            alt={slide.alt || `Slide ${i + 1}`}
            className={`hero-slide absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ${
              i === current ? "is-active opacity-100" : "opacity-0"
            }`}
          />
        ))}

        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-jmuPurple/55 to-jmuPurple/85" />

        <div className="hero-content relative z-10 flex max-w-3xl flex-col items-center justify-center px-4 text-center">
          <h1 className="text-4xl font-bold text-jmuGold drop-shadow-md sm:text-6xl lg:text-7xl">
            JMU Men's Rugby
          </h1>
          <p className="mb-8 mt-3 text-base uppercase tracking-[0.4em] text-jmuLightGold/95 drop-shadow sm:text-xl">
            Fifteen | As | One
          </p>

          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <Link
              to="/schedule"
              className="brand-button brand-button-gold hero-cta px-5 py-2.5 sm:px-6 sm:py-3"
            >
              View Schedule
            </Link>
            <Link
              to="/join"
              className="brand-button brand-button-gold hero-cta px-5 py-2.5 sm:px-6 sm:py-3"
            >
              Join the Team
            </Link>
          </div>
        </div>

        <div className="absolute bottom-5 z-20 flex items-center gap-2 rounded-full border border-jmuGold/55 bg-jmuPurple/45 px-3 py-1.5 backdrop-blur-sm">
          {carouselImages.map((slide, i) => (
            <button
              key={`dot-${slide.key}`}
              type="button"
              onClick={() => setCurrent(i)}
              className={`carousel-dot ${i === current ? "is-active" : ""}`}
              aria-label={`View slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      <section className="surface-card mt-8 p-6 sm:p-8">
        <h2 className="text-2xl font-bold">About the Dukes</h2>
        <p className="mb-6 mt-4 leading-relaxed text-jmuSlate">
          Founded in 1974, JMU Men's Rugby is a tight knit brotherhood competing in the National
          Collegiate Rugby D1-AA division. We pride ourselves on grit, discipline, and a strong culture
          of camaraderie both on and off the pitch.
        </p>
        <Link
          to="/about"
          className="inline-flex items-center font-semibold text-jmuPurple transition hover:text-jmuDarkGold"
        >
          Learn More -&gt;
        </Link>
      </section>

      <section className="surface-card mt-8 p-6 sm:p-8">
        <h2 className="text-2xl font-bold">Next Match</h2>

        {nextMatches.length > 0 ? (
          <Link to="/schedule" className="mt-5 block overflow-hidden rounded-xl border border-jmuDarkGold/70">
            {nextMatches.map((match, index) => (
              <div
                key={match.id}
                className={`${index > 0 ? "border-t border-jmuDarkGold/75" : ""} bg-jmuLightGold/30 px-4 py-4 transition hover:bg-jmuLightGold/55`}
              >
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="mb-1 text-2xl font-bold text-jmuPurple">{match.opponent}</p>
                    <p className="font-medium text-jmuDarkGold">
                      {parseDateOnly(match.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      | {match.home ? "Home" : "Away"} | {match.side}
                    </p>
                  </div>

                  {match.show_result && match.result && (
                    <p className="text-xl font-bold text-jmuPurple">{match.result}</p>
                  )}
                </div>

                {match.notes && (
                  <div className="mt-3 border-t border-jmuDarkGold/70 pt-3 text-sm text-jmuPurple/85">
                    <p className="line-clamp-2 italic">{match.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </Link>
        ) : (
          <p className="mt-6 italic text-jmuDarkGold">No upcoming matches - check back soon.</p>
        )}
      </section>

      <section className="surface-card mb-4 mt-8 p-6 sm:p-8">
        <h2 className="text-2xl font-bold">Gallery</h2>

        {featuredImages.length === 0 ? (
          <p className="mt-6 text-center italic text-jmuDarkGold">No featured photos yet.</p>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
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
                className="h-40 w-full cursor-pointer rounded-lg border border-jmuDarkGold/80 object-cover transition duration-200 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-md sm:h-48"
              />
            ))}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            to="/media"
            className="inline-flex items-center font-semibold text-jmuPurple transition hover:text-jmuDarkGold"
          >
            View More -&gt;
          </Link>
        </div>
      </section>
    </div>
  );
}

