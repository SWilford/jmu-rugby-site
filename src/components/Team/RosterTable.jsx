import React, { useEffect, Fragment } from "react";
import { supabase } from "../../lib/supabaseClient";
import logoPurple from "../../assets/jmu-purple-logo.png";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { buildStoragePublicUrl } from "../../lib/storageUtils";

export default function RosterTable({ expandedId, setExpandedId }) {
  const [roster, setRoster] = React.useState([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("roster").select("*");
      if (error) console.error("Roster fetch error:", error);
      else setRoster(data);
    })();
  }, []);

  const toggleExpand = (type, id) => {
    const key = `${type}-${id}`;
    setExpandedId((prev) => (prev === key ? null : key));
  };

  return (
    <section className="surface-card p-5 sm:p-6">
      <h2 className="mb-4 text-2xl font-bold">Roster</h2>

      {roster.length === 0 ? (
        <p className="mt-6 text-center text-jmuDarkGold">Roster will appear here soon.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-jmuDarkGold/70">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Position</th>
                <th>Year</th>
                <th>Major</th>
                <th>Hometown</th>
              </tr>
            </thead>

            <tbody>
              {roster.map((player) => (
                <Fragment key={`player-${player.id}`}>
                  <tr className="cursor-pointer transition-colors" onClick={() => toggleExpand("player", player.id)}>
                    <td className="font-semibold">{player.name}</td>
                    <td>{player.position}</td>
                    <td>{player.year}</td>
                    <td>{player.major}</td>
                    <td>{player.hometown}</td>
                  </tr>

                  <AnimatePresence initial={false}>
                    {expandedId === `player-${player.id}` && (
                      <Motion.tr
                        key={player.id}
                        className="overflow-hidden border-b border-jmuDarkGold bg-jmuLightGold/25"
                        layout
                        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
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
                            <div className="flex flex-col items-start gap-5 p-4 sm:flex-row sm:gap-6">
                              <img
                                src={buildStoragePublicUrl(player.headshot_url) || logoPurple}
                                alt={player.name}
                                className="h-56 w-40 rounded-lg border border-jmuDarkGold object-cover"
                              />
                              <div className="flex flex-col justify-center text-jmuPurple">
                                <p className="font-semibold text-jmuSlate">
                                  Height: <span className="font-normal">{player.height}</span>
                                </p>
                                <p className="font-semibold text-jmuSlate">
                                  Weight: <span className="font-normal">{player.weight}</span>
                                </p>
                                {player.bio && <p className="mt-3 leading-relaxed text-jmuSlate">{player.bio}</p>}
                              </div>
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
      )}
    </section>
  );
}
