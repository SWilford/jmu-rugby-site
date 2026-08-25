import React, { useEffect, useState, Fragment, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { FaChevronDown, FaChevronUp, FaDownload, FaSpinner, FaTimes } from "react-icons/fa";
import { useLocation } from "react-router-dom";
import {
  extractStorageObjectPath,
  getMediaFilePath,
  getMediaStoredPath,
} from "../lib/mediaUtils";

const MEDIA_BUCKET = "rugby-media";

export default function Media() {
  const [media, setMedia] = useState([]);
  const [expandedAlbum, setExpandedAlbum] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [season, setSeason] = useState("");
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const menuRef = useRef(null);

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

  useEffect(() => {
    if (!selectedPhoto) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setSelectedPhoto(null);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPhoto]);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("media").select("*").order("id", { ascending: false });

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

  const handleDownload = async (photo) => {
    setDownloadBusy(true);
    setDownloadError("");

    try {
      const storedPath = getMediaStoredPath(photo);
      const objectPath = extractStorageObjectPath(storedPath, MEDIA_BUCKET);
      const fileName = objectPath.split("/").pop() || `jmu-rugby-photo-${photo.id}.jpg`;
      const response = await fetch(getMediaFilePath(photo));
      if (!response.ok) throw new Error(`Media download failed with status ${response.status}.`);
      const objectUrl = URL.createObjectURL(await response.blob());

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      link.hidden = true;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      console.error("Media download failed:", error);
      setDownloadError("Download could not start. Please try again.");
    } finally {
      setDownloadBusy(false);
    }
  };

  const filteredMedia = media.filter((m) => m.season_id === season);

  const albums = Object.groupBy
    ? Object.groupBy(filteredMedia, (m) => m.album)
    : filteredMedia.reduce((acc, m) => {
        (acc[m.album] = acc[m.album] || []).push(m);
        return acc;
      }, {});

  if (loading) return <p className="mt-12 text-center text-jmuLightGold">Loading media...</p>;

  return (
    <Motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="surface-card mb-4 mt-8 p-5 sm:p-6"
    >
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="text-3xl font-bold">Media Gallery</h2>

        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-jmuDarkGold">Season:</span>
          <div className="relative inline-block text-left" ref={menuRef}>
            <Motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowMenu((prev) => !prev)}
              className="brand-button brand-button-secondary min-w-44 px-4 py-2"
            >
              {season
                ? season
                    .replace("-", " ")
                    .replace(/^\w/, (c) => c.toUpperCase())
                    .replace(/\b(\d{4})\b/, " $1")
                : "Select Season"}
              <span className="ml-2 text-sm" aria-hidden="true">
                {showMenu ? <FaChevronUp /> : <FaChevronDown />}
              </span>
            </Motion.button>

            <AnimatePresence>
              {showMenu && (
                <Motion.ul
                  key="season-menu"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-jmuDarkGold bg-jmuGold text-jmuPurple shadow-lg"
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
                        className={`cursor-pointer px-4 py-2 transition hover:bg-jmuLightGold/40 ${
                          s === season ? "bg-jmuLightGold/55 font-semibold" : ""
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

      {Object.keys(albums).length === 0 ? (
        <p className="mt-6 text-center text-jmuDarkGold">No photos uploaded for this season.</p>
      ) : (
        Object.entries(albums).map(([albumName, photos]) => (
          <Fragment key={albumName}>
            <div
              data-album={albumName}
              onClick={() => toggleExpand(albumName)}
              className="mt-1 flex cursor-pointer items-center justify-between border-b border-jmuDarkGold/70 py-3 transition hover:bg-jmuLightGold/40"
            >
              <h3 className="text-xl font-bold">{albumName}</h3>
              <span className="text-jmuDarkGold text-base" aria-hidden="true">
                {expandedAlbum === albumName ? <FaChevronUp /> : <FaChevronDown />}
              </span>
            </div>

            <AnimatePresence initial={false}>
              {expandedAlbum === albumName && (
                <Motion.div
                  layout
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="group relative overflow-hidden rounded-lg border border-jmuDarkGold bg-jmuLightGold/20 transition hover:-translate-y-0.5"
                      >
                        <img
                          src={getMediaFilePath(photo)}
                          alt={photo.caption || "JMU Men's Rugby Club"}
                          loading="lazy"
                          decoding="async"
                          className="h-44 w-full cursor-pointer object-cover transition duration-200 group-hover:scale-[1.02]"
                          onClick={() => {
                            setDownloadError("");
                            setSelectedPhoto(photo);
                          }}
                        />
                        {photo.caption && (
                          <p className="mb-2 mt-1 px-2 text-center text-sm text-jmuSlate">{photo.caption}</p>
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

      <AnimatePresence>
        {selectedPhoto && (
          <Motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 backdrop-blur-sm sm:p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
          >
            <Motion.div
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative flex max-h-[96vh] w-full max-w-[96rem] flex-col overflow-hidden rounded-2xl border border-jmuGold/70 bg-jmuOffWhite shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-jmuDarkGold/40 bg-white px-3 py-2.5 sm:px-4">
                <p className="min-w-0 truncate text-sm font-semibold text-jmuPurple sm:text-base">
                  {selectedPhoto.caption || selectedPhoto.album || "JMU Men's Rugby Club photo"}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(null)}
                  className="brand-button brand-button-compact shrink-0 px-3 py-2 text-sm"
                  aria-label="Close selected image"
                >
                  <FaTimes aria-hidden="true" />
                  <span>Close</span>
                </button>
              </div>

              <div className="flex min-h-0 flex-1 items-center justify-center bg-[#17131c] p-2 sm:p-3">
                <img
                  src={getMediaFilePath(selectedPhoto)}
                  alt={selectedPhoto.caption || "JMU Men's Rugby Club"}
                  className="max-h-[calc(96vh-8.5rem)] max-w-full rounded-lg object-contain"
                  decoding="async"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-jmuDarkGold/40 bg-white px-3 py-2.5 sm:px-4">
                <div aria-live="polite">
                  {downloadError ? (
                    <p className="text-sm font-semibold text-red-700">{downloadError}</p>
                  ) : (
                    <p className="text-xs text-jmuSlate/75">Full-resolution image</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(selectedPhoto)}
                  disabled={downloadBusy}
                  className="brand-button px-4 py-2 text-sm disabled:cursor-wait disabled:opacity-60"
                >
                  {downloadBusy ? (
                    <FaSpinner className="animate-spin" aria-hidden="true" />
                  ) : (
                    <FaDownload aria-hidden="true" />
                  )}
                  {downloadBusy ? "Preparing..." : "Download"}
                </button>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.section>
  );
}
