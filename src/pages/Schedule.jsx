// src/pages/Schedule.jsx
import React, { useEffect, useState, Fragment } from "react";
import { supabase } from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { useRef } from "react";


export default function Schedule() {
  const [matches, setMatches] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);


  // Fetch all seasons
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("season_id, season_name");

      if (error) {
        console.error("Season fetch error:", error);
        return;
      }

      // dedupe
      const unique = Array.from(new Map(data.map((s) => [s.season_id, s])).values());

      // proper custom sort
      unique.sort((a, b) => {
        const [sa, sy] = a.season_id.split("-");
        const [sb, syb] = b.season_id.split("-");

        // sort by year descending first
        if (sy !== syb) return Number(syb) - Number(sy);

        // same year: Fall before Spring
        if (sa === "fall" && sb === "spring") return -1;
        if (sa === "spring" && sb === "fall") return 1;
        return 0;
      });

      setSeasons(unique);

      // set default to first (newest fall or spring)
      if (unique.length > 0) setCurrentSeason(unique[0].season_id);
    })();
  }, []);


  // Fetch matches for the current season
  useEffect(() => {
    if (!currentSeason) return;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("season_id", currentSeason)
        .order("date", { ascending: true });

      if (error) console.error("Schedule fetch error:", error);
      else {
        const sorted = (data || []).sort((a, b) => {
          const dateCompare = new Date(a.date) - new Date(b.date);
          if (dateCompare !== 0) return dateCompare;

          const isSpring = (a.season_id || "")
            .toLowerCase()
            .includes("spring");

          const sideOrder = isSpring
            ? { "7s": 1, "15s": 2 }
            : { A: 1, B: 2, C: 3, Combined: 4 };

          return (sideOrder[a.side] || 99) - (sideOrder[b.side] || 99);
        });

        setMatches(sorted);
      }
      setLoading(false);
    })();
  }, [currentSeason]);

  // close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleExpand = (id) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  if (loading)
    return (
      <p className="text-center mt-12 text-jmuLightGold">
        Loading schedule...
      </p>
    );

  return (
    <section className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-6 mt-8">
      {/* Header & Season Dropdown */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          Season:
          <div className="relative inline-block text-left" ref={menuRef}>
            {/* Dropdown toggle button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowMenu((prev) => !prev)}
              className="inline-flex justify-between items-center bg-jmuDarkGold text-jmuOffWhite font-semibold rounded-md px-3 py-1 border border-jmuGold hover:bg-jmuGold hover:text-jmuPurple transition whitespace-nowrap min-w-36"
            >
              {seasons.find((s) => s.season_id === currentSeason)?.season_name ||
                "Select Season"}
              <span className="ml-2">▾</span>
            </motion.button>

            {/* Dropdown menu */}
            <AnimatePresence>
              {showMenu && (
                <motion.ul
                  key="season-menu"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="absolute z-20 mt-1 w-full bg-jmuGold text-jmuPurple rounded-md shadow-lg border border-jmuDarkGold overflow-y-auto max-h-48 whitespace-nowrap"
                >
                  {seasons
                    .sort((a, b) => {
                      const [sa, sy] = a.season_id.split("-");
                      const [sb, syb] = b.season_id.split("-");
                      if (sy !== syb) return syb - sy; // newer year first
                      return sa === "fall" ? -1 : 1; // fall before spring
                    })
                    .map((s) => (
                      <li
                        key={s.season_id}
                        onClick={() => {
                          setCurrentSeason(s.season_id);
                          setShowMenu(false);
                        }}
                        className={`px-3 py-1 cursor-pointer hover:bg-jmuLightGold/40 transition ${
                          s.season_id === currentSeason
                            ? "bg-jmuLightGold/50 font-semibold"
                            : ""
                        }`}
                      >
                        {s.season_name}
                      </li>
                    ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        </h2>
      </div>

      {/* Main Table */}
      {matches.length === 0 ? (
        <p className="text-center text-jmuDarkGold mt-6">
          Schedule will appear here soon.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-fixed overflow-hidden">
            <thead className="bg-jmuDarkGold text-jmuOffWhite uppercase tracking-wide">
              <tr>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Opponent</th>
                <th className="text-left p-2">Side</th>
                <th className="text-left p-2">Location</th>
                <th className="text-left p-2">Result</th>
              </tr>
            </thead>

            <tbody>
              {matches.map((m) => (
                <Fragment key={m.id}>
                  {/* Clickable Match Row */}
                  <tr
                    className="border-b border-jmuDarkGold hover:bg-jmuLightGold/30 hover:cursor-pointer transition-colors"
                    onClick={() => toggleExpand(m.id)}
                  >
                    <td className="p-2 font-semibold">
                      {new Date(m.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="p-2">{m.opponent}</td>
                    <td className="p-2">{m.side}</td>
                    <td className="p-2">{m.home ? "Home" : "Away"}</td>
                    <td className="p-2">
                      {m.show_result && m.result ? m.result : ""}
                    </td>
                  </tr>

                  {/* Expandable Notes Row */}
                  <AnimatePresence initial={false}>
                    {expanded === m.id && (
                      <motion.tr
                        key={`expand-${m.id}`}
                        className="border-b border-jmuDarkGold bg-jmuLightGold/20 overflow-hidden"
                        layout
                        transition={{
                          duration: 0.4,
                          ease: [0.25, 0.1, 0.25, 1],
                        }}
                      >
                        <td colSpan="5" className="p-0">
                          <motion.div
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
                            <div className="p-4 text-jmuPurple">
                              {m.notes ? (
                                <p className="leading-relaxed">{m.notes}</p>
                              ) : (
                                <p className="italic text-jmuDarkGold">
                                  No notes or recap available.
                                </p>
                              )}
                            </div>
                          </motion.div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
