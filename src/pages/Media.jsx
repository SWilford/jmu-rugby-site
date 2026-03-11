import React, { useEffect, useState, Fragment, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { getMediaFilePath } from "../lib/mediaUtils";

export default function Media() {
  const [media, setMedia] = useState([]);
  const [expandedAlbum, setExpandedAlbum] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [season, setSeason] = useState("");
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // auto-detect current season
  useEffect(() => {
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    let seasonPrefix;
    if (month <= 1) seasonPrefix = "spring";
    else if (month >= 2 && month <= 5) seasonPrefix = "spring";
    else if (month >= 6 && month <= 11) seasonPrefix = "fall";
    const seasonYear = month === 11 ? year + 1 : year;
    setSeason(`${seasonPrefix}-${seasonYear}`);
  }, []);

  // handle URL params for album, season, and photo
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetAlbum = params.get("album");
    const targetSeason = params.get("season");
    const targetPhoto = params.get("photo");

    if (targetAlbum && targetSeason) {
      setSeason(targetSeason);
      setExpandedAlbum(targetAlbum);

      const timer = setTimeout(() => {
        if (targetPhoto && media.length > 0) {
          const found = media.find((m) => String(m.id) === String(targetPhoto));
          if (found) setSelectedPhoto(found);
        }
        const el = document.querySelector(`[data-album="${CSS.escape(targetAlbum)}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [location.search, media]);

  // close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // fetch all media
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("media")
        .select("*")
        .order("id", { ascending: false });

      if (error) console.error("Media fetch error:", error);
      else {
        setMedia(data || []);

        const seasonSet = new Set(data.map((m) => m.season_id));
        const sorted = Array.from(seasonSet).sort((a, b) => {
          const [aSeason, aYear] = a.split("-");
          const [bSeason, bYear] = b.split("-");
          if (aYear !== bYear) return bYear - aYear;
          const order = { fall: 1, spring: 2 };
          return order[aSeason] - order[bSeason];
        });
        setSeasons(sorted);
      }
      setLoading(false);
    })();
  }, []);

  const toggleExpand = (album) => {
    setExpandedAlbum((prev) => (prev === album ? null : album));
  };

  const handleDownload = (url) => {
    const fileName = url.split("/").pop();
    const downloadUrl = `${url}?download=${encodeURIComponent(fileName)}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredMedia = media.filter((m) => m.season_id === season);

  const albums = Object.groupBy
    ? Object.groupBy(filteredMedia, (m) => m.album)
    : filteredMedia.reduce((acc, m) => {
        (acc[m.album] = acc[m.album] || []).push(m);
        return acc;
      }, {});

  if (loading)
    return (
      <p className="text-center mt-12 text-jmuLightGold">Loading media...</p>
    );

  return (
    <section className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-6 mt-8 mb-4">
      {/* Header (inline layout) */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        {/* Left: title */}
        <h2 className="text-3xl font-bold text-jmuPurple">Media Gallery</h2>

        {/* Right: season dropdown */}
      <div className="flex items-center gap-3 mt-3 sm:mt-0">
        <span className="text-3xl font-bold text-jmuPurple leading-none">Season:</span>
          <div className="relative inline-block text-left" ref={menuRef}>
            <Motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowMenu((prev) => !prev)}
              className="inline-flex justify-between items-center bg-jmuDarkGold text-jmuOffWhite text-2xl font-semibold leading-none rounded-md px-4 py-1.5 border border-jmuGold hover:bg-jmuGold hover:text-jmuPurple transition whitespace-nowrap min-w-40"
            >
              {season
                ? season
                    .replace("-", " ")
                    .replace(/^\w/, (c) => c.toUpperCase())
                    .replace(/\b(\d{4})\b/, " $1")
                : "Select Season"}
              <span className="ml-2">▾</span>
            </Motion.button>

            <AnimatePresence>
              {showMenu && (
                <Motion.ul
                  key="season-menu"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="absolute z-20 mt-1 w-full bg-jmuGold text-jmuPurple rounded-md shadow-lg border border-jmuDarkGold overflow-y-auto max-h-48 whitespace-nowrap"
                >
                  {seasons
                    .sort((a, b) => {
                      const [sa, sy] = a.split("-");
                      const [, syb] = b.split("-");
                      if (sy !== syb) return syb - sy;
                      return sa === "fall" ? -1 : 1;
                    })
                    .map((s) => (
                      <li
                        key={s}
                        onClick={() => {
                          setSeason(s);
                          setShowMenu(false);
                        }}
                        className={`px-4 py-1.5 text-2xl cursor-pointer hover:bg-jmuLightGold/40 transition ${
                          s === season ? "bg-jmuLightGold/50 font-semibold" : ""
                        }`}
                      >
                        {s
                          .replace("-", " ")
                          .replace(/^\w/, (c) => c.toUpperCase())
                          .replace(/\b(\d{4})\b/, " $1")}
                      </li>

                    ))}
                </Motion.ul>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Album display */}
      {Object.keys(albums).length === 0 ? (
        <p className="text-center text-jmuDarkGold mt-6">
          No photos uploaded for this season.
        </p>
      ) : (
        Object.entries(albums).map(([albumName, photos]) => (
          <Fragment key={albumName}>
            <div
              data-album={albumName}
              onClick={() => toggleExpand(albumName)}
              className="flex justify-between items-center border-b border-jmuDarkGold py-3 hover:bg-jmuLightGold/30 cursor-pointer transition-colors"
            >
              <h3 className="text-xl font-bold">{albumName}</h3>
              <span className="text-jmuDarkGold text-lg">
                {expandedAlbum === albumName ? "▲" : "▼"}
              </span>
            </div>

            <AnimatePresence initial={false}>
              {expandedAlbum === albumName && (
                <Motion.div
                  layout
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  transition={{
                    duration: 0.4,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 py-4">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative group overflow-hidden rounded-md border border-jmuDarkGold bg-jmuLightGold/10 hover:bg-jmuLightGold/30 transition"
                      >
                        <img
                          src={getMediaFilePath(photo)}
                          alt={photo.caption || "JMU Rugby"}
                          className="object-cover w-full h-48 cursor-pointer"
                          onClick={() => setSelectedPhoto(photo)}
                        />
                        {photo.caption && (
                          <p className="text-sm text-center text-jmuPurple mt-1 mb-2">
                            {photo.caption}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Motion.div>
              )}
            </AnimatePresence>
          </Fragment>
        ))
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {selectedPhoto && (
          <Motion.div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
          >
            <Motion.div
              className="relative bg-jmuOffWhite p-4 rounded-md max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={getMediaFilePath(selectedPhoto)}
                alt={selectedPhoto.caption || "JMU Rugby"}
                className="max-h-[80vh] w-full object-contain rounded-md"
              />
              <div className="flex justify-between items-center mt-4">
                <p className="text-jmuPurple text-sm">
                  {selectedPhoto.caption || ""}
                </p>
                <button
                  onClick={() => handleDownload(getMediaFilePath(selectedPhoto))}
                  className="border border-jmuDarkGold text-jmuPurple font-semibold px-3 py-1 rounded hover:bg-jmuGold hover:text-jmuPurple transition"
                >
                  Download
                </button>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-2 right-3 text-3xl text-jmuPurple hover:text-jmuGold"
              >
                ✕
              </button>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
