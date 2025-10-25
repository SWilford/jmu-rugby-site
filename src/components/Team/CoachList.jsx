// src/components/Team/CoachList.jsx
import React, { useEffect, useState, Fragment } from "react";
import { supabase } from "../../lib/supabaseClient";
import logoPurple from "../../assets/jmu-purple-logo.png";
import { motion, AnimatePresence } from "framer-motion";

export default function CoachList({ expandedId, setExpandedId }) {
  const [coaches, setCoaches] = React.useState([]);

  useEffect(() => {
    (async () => {
        const { data, error } = await supabase.from("coaches").select("*");
        if (error) {
        console.error("Coach fetch error:", error);
        } else {
        // always list Head Coach first
        const sorted = [
            ...data.filter((c) => c.position.toLowerCase().includes("head coach")),
            ...data.filter((c) => !c.position.toLowerCase().includes("head coach")),
        ];
        setCoaches(sorted);
        }
    })();
  }, []);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section className="w-full bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-6">
      <h2 className="text-2xl font-bold mb-4">Coaching Staff</h2>

      {coaches.length === 0 ? (
        <p className="text-center text-jmuDarkGold mt-6">
          Coaches will appear here soon.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-fixed overflow-hidden">
            <thead className="bg-jmuDarkGold text-jmuOffWhite uppercase tracking-wide">
              <tr>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Position</th>
              </tr>
            </thead>

            <tbody>
              {coaches.map((coach) => (
                <Fragment key={coach.id}>
                  <tr
                    className="border-b border-jmuDarkGold hover:bg-jmuLightGold hover:cursor-pointer transition-colors"
                    onClick={() => toggleExpand(coach.id)}
                  >
                    <td className="p-2 font-semibold">{coach.name}</td>
                    <td className="p-2">{coach.position}</td>
                  </tr>

                  <AnimatePresence initial={false}>
                    {expandedId === coach.id && (
                      <motion.tr
                        key={coach.id}
                        className="border-b border-jmuDarkGold bg-jmuLightGold/20 overflow-hidden"
                        layout
                        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                      >
                        <td colSpan="2" className="p-0">
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
                                src={coach.headshot_url || logoPurple}
                                alt={coach.name}
                                className="w-40 h-56 object-cover rounded-md border border-jmuDarkGold"
                              />
                              <div className="flex flex-col justify-center text-jmuPurple">
                                {coach.bio && (
                                  <p className="font-medium leading-relaxed">
                                    {coach.bio}
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
