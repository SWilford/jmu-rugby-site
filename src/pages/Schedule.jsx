// src/pages/Schedule.jsx
import React, { useEffect, useState, Fragment } from "react";
import { supabase } from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

export default function Schedule() {
  const [matches, setMatches] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("season_id", "fall-2025") // temporary, will be dynamic later
        .order("date", { ascending: true });

      if (error) console.error("Schedule fetch error:", error);
      else {
        const sorted = (data || []).sort((a, b) => {
          const dateCompare = new Date(a.date) - new Date(b.date);
          if (dateCompare !== 0) return dateCompare;

          // choose side order depending on season name
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
      <h2 className="text-2xl font-bold mb-4">Fall 2025 Season</h2>

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
                  {/* main clickable row */}
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

                  {/* expandable notes row */}
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
