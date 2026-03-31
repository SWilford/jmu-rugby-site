import React, { useEffect, useState, Fragment, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

const parseDateOnly = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export default function Schedule() {
  const [matches, setMatches] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("matches").select("season_id, season_name");

      if (error) {
        console.error("Season fetch error:", error);
        return;
      }

      const unique = Array.from(new Map(data.map((s) => [s.season_id, s])).values());

      unique.sort((a, b) => {
        const [sa, sy] = a.season_id.split("-");
        const [sb, syb] = b.season_id.split("-");

        if (sy !== syb) return Number(syb) - Number(sy);

        if (sa === "fall" && sb === "spring") return -1;
        if (sa === "spring" && sb === "fall") return 1;
        return 0;
      });

      setSeasons(unique);

      if (unique.length > 0) setCurrentSeason(unique[0].season_id);
    })();
  }, []);

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

          const isSpring = (a.season_id || "").toLowerCase().includes("spring");

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

  if (loading) {
    return <p className="mt-12 text-center text-jmuLightGold">Loading schedule...</p>;
  }

  return (
    <section className="surface-card mt-8 p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Season Schedule</h2>

        <div className="inline-flex items-center gap-3">
          <span className="font-semibold text-jmuDarkGold">Season:</span>
          <div className="relative inline-block text-left" ref={menuRef}>
            <Motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowMenu((prev) => !prev)}
              className="inline-flex min-w-40 items-center justify-between rounded-lg border border-jmuDarkGold bg-jmuDarkGold px-3 py-2 font-semibold text-jmuOffWhite transition hover:bg-jmuGold hover:text-jmuPurple"
            >
              {seasons.find((s) => s.season_id === currentSeason)?.season_name || "Select Season"}
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
                      const [sa, sy] = a.season_id.split("-");
                      const [, syb] = b.season_id.split("-");
                      if (sy !== syb) return syb - sy;
                      return sa === "fall" ? -1 : 1;
                    })
                    .map((s) => (
                      <li
                        key={s.season_id}
                        onClick={() => {
                          setCurrentSeason(s.season_id);
                          setShowMenu(false);
                        }}
                        className={`cursor-pointer px-3 py-2 transition hover:bg-jmuLightGold/40 ${
                          s.season_id === currentSeason ? "bg-jmuLightGold/55 font-semibold" : ""
                        }`}
                      >
                        {s.season_name}
                      </li>
                    ))}
                </Motion.ul>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {matches.length === 0 ? (
        <p className="mt-6 text-center text-jmuDarkGold">Schedule will appear here soon.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-jmuDarkGold/70 md:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Opponent</th>
                  <th>Side</th>
                  <th>Location</th>
                  <th>Result</th>
                </tr>
              </thead>

              <tbody>
                {matches.map((m) => (
                  <Fragment key={m.id}>
                    <tr className="cursor-pointer transition-colors" onClick={() => toggleExpand(m.id)}>
                      <td className="font-semibold">
                        {parseDateOnly(m.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td>{m.opponent}</td>
                      <td>{m.side}</td>
                      <td>{m.home ? "Home" : "Away"}</td>
                      <td>{m.show_result && m.result ? m.result : ""}</td>
                    </tr>

                    <AnimatePresence initial={false}>
                      {expanded === m.id && (
                        <Motion.tr
                          key={`expand-${m.id}`}
                          className="overflow-hidden border-b border-jmuDarkGold bg-jmuLightGold/25"
                          layout
                          transition={{
                            duration: 0.35,
                            ease: [0.25, 0.1, 0.25, 1],
                          }}
                        >
                          <td colSpan="5" className="p-0">
                            <Motion.div
                              layout
                              initial={{ height: 0 }}
                              animate={{ height: "auto" }}
                              exit={{ height: 0 }}
                              transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 text-jmuPurple">
                                {m.notes ? (
                                  <p className="leading-relaxed text-jmuSlate">{m.notes}</p>
                                ) : (
                                  <p className="italic text-jmuDarkGold">No notes or recap available.</p>
                                )}
                              </div>
                            </Motion.div>
                          </td>
                        </Motion.tr>
                      )}
                    </AnimatePresence>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-data-stack md:hidden">
            {matches.map((m) => {
              const isOpen = expanded === m.id;
              return (
                <article key={m.id} className="mobile-data-card">
                  <button
                    type="button"
                    onClick={() => toggleExpand(m.id)}
                    aria-expanded={isOpen}
                    className="mobile-data-trigger"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-jmuDarkGold">
                          {parseDateOnly(m.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-base font-bold text-jmuPurple">{m.opponent}</p>
                      </div>
                      <span className={`mobile-expand-icon ${isOpen ? "is-open" : ""}`} aria-hidden="true">
                        +
                      </span>
                    </div>
                    <div className="mobile-data-meta mt-2">
                      <p>
                        <span className="mobile-data-label">Side</span>
                        <span className="mobile-data-value">{m.side || "-"}</span>
                      </p>
                      <p>
                        <span className="mobile-data-label">Location</span>
                        <span className="mobile-data-value">{m.home ? "Home" : "Away"}</span>
                      </p>
                      {m.show_result && (
                        <p>
                          <span className="mobile-data-label">Result</span>
                          <span className="mobile-data-value">{m.result || "-"}</span>
                        </p>
                      )}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <Motion.div
                        key={`expand-${m.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="mobile-data-expanded">
                          {m.notes ? (
                            <p className="text-sm leading-relaxed text-jmuSlate">{m.notes}</p>
                          ) : (
                            <p className="text-sm italic text-jmuDarkGold">No notes or recap available.</p>
                          )}
                        </div>
                      </Motion.div>
                    )}
                  </AnimatePresence>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
