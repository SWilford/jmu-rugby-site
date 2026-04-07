import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";
import { supabase } from "../lib/supabaseClient";
import { getMediaFilePath, MEDIA_HOME_CAROUSEL_COLUMNS } from "../lib/mediaUtils";
import { motion as Motion, AnimatePresence } from "framer-motion";

import img0 from "../assets/home/image0.jpeg";
import img1 from "../assets/home/image1.jpeg";
import img2 from "../assets/home/image2.jpeg";
import img3 from "../assets/home/image3.jpeg";
import img4 from "../assets/home/image4.jpeg";
import img5 from "../assets/home/image5.JPG";

const MAX_CAROUSEL_IMAGES = 6;
const CAROUSEL_CYCLE_MS = 6000;
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
    }, CAROUSEL_CYCLE_MS);

    return () => clearInterval(interval);
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
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="page-shell min-h-full justify-between pt-6 sm:pt-8"
    >
      <section className="relative mt-2 flex h-[55vh] w-full max-w-6xl flex-col items-center justify-center overflow-hidden rounded-2xl border border-jmuDarkGold/60 shadow-xl sm:h-[68vh]">
        <AnimatePresence mode="popLayout">
          {carouselImages.length > 0 && (
            <Motion.img
              key={current}
              src={carouselImages[current].src}
              alt={carouselImages[current].alt}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
            />
          )}
        </AnimatePresence>

        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/40 via-jmuPurple/50 to-jmuPurple/90" />

        <div className="relative z-20 flex max-w-3xl flex-col items-center justify-center px-4 text-center">
          <Motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-4xl font-bold text-jmuGold drop-shadow-lg sm:text-6xl lg:text-7xl"
          >
            JMU Men's Rugby
          </Motion.h1>
          <Motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mb-8 mt-3 text-base uppercase tracking-[0.4em] text-jmuLightGold/95 drop-shadow-md sm:text-xl font-semibold"
          >
            Fifteen | As | One
          </Motion.p>

          <Motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-wrap justify-center gap-4 sm:gap-6"
          >
            <Link to="/schedule" className="brand-button brand-button-gold px-6 py-3 sm:px-8 sm:py-3.5 text-sm sm:text-base">
              View Schedule
            </Link>
            <Link to="/join" className="brand-button brand-button-gold px-6 py-3 sm:px-8 sm:py-3.5 text-sm sm:text-base">
              Join the Team
            </Link>
          </Motion.div>
        </div>

        <div className="absolute bottom-6 z-30 flex items-center gap-2.5 rounded-full border border-jmuGold/40 bg-jmuPurple/60 px-4 py-2 backdrop-blur-md">
          {carouselImages.map((slide, i) => (
            <button
              key={`dot-${slide.key}`}
              type="button"
              onClick={() => setCurrent(i)}
              className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                i === current ? "bg-jmuGold w-6" : "bg-jmuLightGold/40 hover:bg-jmuLightGold/80"
              }`}
              aria-label={`View slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      <section className="surface-card mt-12 p-8 sm:p-10">
        <h2 className="text-2xl font-bold text-jmuPurple sm:text-3xl">About the Dukes</h2>
        <p className="mb-6 mt-4 text-lg leading-relaxed text-jmuSlate">
          Founded in 1974, JMU Men's Rugby is a tight knit brotherhood competing in the National
          Collegiate Rugby D1-AA division. We pride ourselves on grit, discipline, and a strong culture
          of camaraderie both on and off the pitch.
        </p>
        <Link
          to="/about"
          className="inline-flex items-center gap-2 font-bold text-jmuPurple transition hover:text-jmuDarkGold text-lg"
        >
          Learn More <FaArrowRight aria-hidden="true" />
        </Link>
      </section>

      <section className="surface-card mt-12 p-8 sm:p-10">
        <h2 className="text-2xl font-bold text-jmuPurple sm:text-3xl mb-6">Next Match</h2>

        {nextMatches.length > 0 ? (
          <Link to="/schedule" className="block overflow-hidden rounded-xl border border-jmuDarkGold/40 transition hover:shadow-lg">
            {nextMatches.map((match, index) => (
              <div
                key={match.id}
                className={`${index > 0 ? "border-t border-jmuDarkGold/30" : ""} bg-white/60 px-6 py-5 transition hover:bg-white/90`}
              >
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="mb-1 text-2xl font-bold text-jmuPurple">{match.opponent}</p>
                    <p className="font-medium text-jmuDarkGold text-lg">
                      {parseDateOnly(match.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      | {match.home ? "Home" : "Away"} | {match.side}
                    </p>
                  </div>

                  {match.show_result && match.result && (
                    <p className="text-2xl font-bold text-jmuPurple bg-jmuGold/20 px-4 py-2 rounded-lg">{match.result}</p>
                  )}
                </div>

                {match.notes && (
                  <div className="mt-4 border-t border-jmuDarkGold/20 pt-4 text-base text-jmuSlate">
                    <p className="line-clamp-2 italic">{match.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </Link>
        ) : (
          <div className="bg-jmuLightGold/30 p-6 rounded-xl border border-jmuDarkGold/30">
            <p className="italic text-jmuDarkGold text-lg">No upcoming matches scheduled - check back soon.</p>
          </div>
        )}
      </section>

      <section className="surface-card mt-12 p-8 sm:p-10">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-2xl font-bold text-jmuPurple sm:text-3xl">Follow Us on Instagram</h2>
          <a
            href="https://www.instagram.com/jmumensrugby/"
            target="_blank"
            rel="noreferrer"
            className="brand-button px-5 py-2.5 text-sm"
          >
            Open @jmumensrugby
          </a>
        </div>

        <div className="instagram-embed-shell overflow-hidden rounded-xl border border-jmuDarkGold/40 bg-white shadow-sm transition hover:shadow-md">
          <iframe
            src="https://www.instagram.com/jmumensrugby/embed"
            title="JMU Men's Rugby Instagram feed"
            loading="lazy"
            className="instagram-embed-frame w-full border-0"
          />
        </div>
      </section>

      <section className="surface-card mb-8 mt-12 p-8 sm:p-10">
        <h2 className="text-2xl font-bold text-jmuPurple sm:text-3xl mb-6">Gallery</h2>

        {featuredImages.length === 0 ? (
          <p className="text-center italic text-jmuDarkGold text-lg py-8">No featured photos yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {featuredImages.map((photo) => (
              <Motion.img
                whileHover={{ scale: 1.03, y: -4 }}
                transition={{ type: "spring", stiffness: 300 }}
                key={photo.id}
                src={getMediaFilePath(photo)}
                alt={photo.album}
                onClick={() =>
                  navigate(
                    `/media?album=${encodeURIComponent(photo.album)}&season=${photo.season_id}&photo=${photo.id}`
                  )
                }
                className="h-44 w-full cursor-pointer rounded-xl border border-jmuDarkGold/30 object-cover shadow-sm"
              />
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            to="/media"
            className="inline-flex items-center gap-2 font-bold text-jmuPurple transition hover:text-jmuDarkGold text-lg"
          >
            View More Photos <FaArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>
    </Motion.div>
  );
}
