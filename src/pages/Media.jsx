import React, { useEffect, useState, Fragment, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { FaChevronDown, FaChevronUp, FaDownload, FaTimes } from "react-icons/fa";
import { useLocation } from "react-router-dom";
import { getMediaFilePath } from "../lib/mediaUtils";

export default function Media() {
  const [media, setMedia] = useState([]);
  const [expandedAlbum, setExpandedAlbum] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [season, setSeason] = useState("");
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
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
      }, 100);
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
    const url = getMediaFilePath(photo);
    const storedName = String(photo?.file_path || photo?.filepath || "").split("/").pop();
    const fallbackName = `jmu-rugby-photo-${photo?.id || "download"}.jpg`;
    let decodedName = storedName || fallbackName;
    try {
      decodedName = decodeURIComponent(decodedName);
    } catch {
      // Keep the stored name when it contains a malformed percent sequence.
    }
    const fileName = decodedName.replace(/[<>:"/\\|?*]/g, "-");

    setDownloading(true);
    setDownloadError("");

    try {
      const response = await fetch(url, { credentials: "omit" });
      if (!response.ok) throw new Error(`Download failed with status ${response.status}`);

      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error("Photo download error:", error);
      setDownloadError("Download failed. Please try again.");
    } finally {
      setDownloading(false);
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
              className="inline-flex min-w-44 items-center justify-between rounded-lg border border-jmuDarkGold bg-jmuDarkGold px-4 py-2 font-semibold text-jmuOffWhite transition hover:bg-jmuGold hover:text-jmuPurple"
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
            <button
              type="button"
              data-album={albumName}
              onClick={() => toggleExpand(albumName)}
              className="mt-1 flex w-full cursor-pointer items-center justify-between border-b border-jmuDarkGold/70 py-3 text-left transition hover:bg-jmuLightGold/40"
              aria-expanded={expandedAlbum === albumName}
            >
              <h3 className="text-xl font-bold">{albumName}</h3>
              <span className="text-jmuDarkGold text-base" aria-hidden="true">
                {expandedAlbum === albumName ? <FaChevronUp /> : <FaChevronDown />}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {expandedAlbum === albumName && (
                <Motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="group relative overflow-hidden rounded-lg border border-jmuDarkGold bg-jmuLightGold/20 transition hover:-translate-y-0.5"
                      >
                        <button
                          type="button"
                          className="media-image-shell block h-44 w-full overflow-hidden"
                          onClick={() => {
                            setDownloadError("");
                            setSelectedPhoto(photo);
                          }}
                          aria-label={`Open ${photo.caption || "JMU Men's Rugby Club photo"}`}
                        >
                          <img
                            src={getMediaFilePath(photo)}
                            alt={photo.caption || "JMU Men's Rugby Club"}
                            loading="lazy"
                            decoding="async"
                            onLoad={(event) => event.currentTarget.classList.add("is-loaded")}
                            className="progressive-image h-full w-full object-cover group-hover:scale-[1.02]"
                          />
                        </button>
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

      <AnimatePresence initial={false}>
        {selectedPhoto && (
          <Motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 backdrop-blur-sm sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setSelectedPhoto(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Selected gallery photo"
          >
            <Motion.div
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex h-[96dvh] w-[97vw] max-w-none flex-col overflow-hidden rounded-2xl border border-white/20 bg-[#100a17] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.6)] sm:h-[94dvh] sm:w-[95vw] sm:p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={getMediaFilePath(selectedPhoto)}
                alt={selectedPhoto.caption || "JMU Men's Rugby Club"}
                decoding="async"
                className="min-h-0 w-full flex-1 rounded-xl object-contain"
              />
              <div className="flex min-h-14 items-center justify-between gap-3 px-2 pt-2 sm:px-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-jmuLightGold/90">
                    {selectedPhoto.caption || "JMU Men's Rugby Club"}
                  </p>
                  {downloadError && (
                    <p className="mt-0.5 text-xs text-red-300" role="alert">
                      {downloadError}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void handleDownload(selectedPhoto)}
                  disabled={downloading}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-jmuGold bg-jmuGold px-4 py-2 text-sm font-bold text-jmuPurple transition hover:bg-jmuLightGold disabled:cursor-wait disabled:opacity-65"
                >
                  <FaDownload aria-hidden="true" />
                  {downloading ? "Downloading…" : "Download"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-black/70 text-xl text-white shadow-lg backdrop-blur transition hover:scale-105 hover:border-jmuGold hover:bg-jmuPurple hover:text-jmuGold focus:outline-none focus-visible:ring-2 focus-visible:ring-jmuGold"
                aria-label="Close selected image"
                autoFocus
              >
                <FaTimes aria-hidden="true" />
              </button>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.section>
  );
}
