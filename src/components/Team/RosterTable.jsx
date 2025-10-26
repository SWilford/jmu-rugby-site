import React, { useEffect, useState, Fragment } from "react";
import { supabase } from "../../lib/supabaseClient";
import logoPurple from "../../assets/jmu-purple-logo.png";
import { motion, AnimatePresence } from "framer-motion";

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
    <section className="w-full bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-6">
      <h2 className="text-2xl font-bold mb-4">Roster</h2>

      {roster.length === 0 ? (
        <p className="text-center text-jmuDarkGold mt-6">
          Roster will appear here soon.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-fixed overflow-hidden">
            <thead className="bg-jmuDarkGold text-jmuOffWhite uppercase tracking-wide">
              <tr>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Position</th>
                <th className="text-left p-2">Year</th>
                <th className="text-left p-2">Major</th>
                <th className="text-left p-2">Hometown</th>
              </tr>
            </thead>

            <tbody>
              {roster.map((player) => (
                <Fragment key={`player-${player.id}`}>
                  <tr
                    className="border-b border-jmuDarkGold hover:bg-jmuLightGold hover:cursor-pointer transition-colors"
                    onClick={() => toggleExpand("player", player.id)}
                  >
                    <td className="p-2 font-semibold">{player.name}</td>
                    <td className="p-2">{player.position}</td>
                    <td className="p-2">{player.year}</td>
                    <td className="p-2">{player.major}</td>
                    <td className="p-2">{player.hometown}</td>
                  </tr>

                  <AnimatePresence initial={false}>
                    {expandedId === `player-${player.id}` && (
                      <motion.tr
                        key={player.id}
                        className="border-b border-jmuDarkGold bg-jmuLightGold/20 overflow-hidden"
                        layout
                        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                      >
                        <td colSpan="5" className="p-0">
                          <motion.div
                            layout
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 flex flex-col sm:flex-row items-start gap-6">
                              <img
                                src={player.headshot_url || logoPurple}
                                alt={player.name}
                                className="w-40 h-56 object-cover rounded-md border border-jmuDarkGold"
                              />
                              <div className="flex flex-col justify-center text-jmuPurple">
                                <p className="font-semibold">
                                  Height:{" "}
                                  <span className="font-normal">
                                    {player.height}
                                  </span>
                                </p>
                                <p className="font-semibold">
                                  Weight:{" "}
                                  <span className="font-normal">
                                    {player.weight}
                                  </span>
                                </p>
                                {player.bio && (
                                  <p className="mt-3 font-medium leading-relaxed">
                                    {player.bio}
                                  </p>
                                )}
                              </div>
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
