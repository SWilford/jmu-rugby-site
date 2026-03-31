import React, { useEffect, Fragment } from "react";
import { supabase } from "../../lib/supabaseClient";
import logoPurple from "../../assets/jmu-purple-logo.png";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { buildStoragePublicUrl } from "../../lib/storageUtils";

export default function CoachList({ expandedId, setExpandedId }) {
  const [coaches, setCoaches] = React.useState([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("coaches").select("*");
      if (error) {
        console.error("Coach fetch error:", error);
      } else {
        const sorted = [
          ...data.filter((c) => c.position.toLowerCase().includes("head coach")),
          ...data.filter((c) => !c.position.toLowerCase().includes("head coach")),
        ];
        setCoaches(sorted);
      }
    })();
  }, []);

  const toggleExpand = (type, id) => {
    const key = `${type}-${id}`;
    setExpandedId((prev) => (prev === key ? null : key));
  };

  return (
    <section className="surface-card p-5 sm:p-6">
      <h2 className="mb-4 text-2xl font-bold">Coaching Staff</h2>

      {coaches.length === 0 ? (
        <p className="mt-6 text-center text-jmuDarkGold">Coaches will appear here soon.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-jmuDarkGold/70">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Position</th>
              </tr>
            </thead>

            <tbody>
              {coaches.map((coach) => (
                <Fragment key={`coach-${coach.id}`}>
                  <tr className="cursor-pointer transition-colors" onClick={() => toggleExpand("coach", coach.id)}>
                    <td className="font-semibold">{coach.name}</td>
                    <td>{coach.position}</td>
                  </tr>

                  <AnimatePresence initial={false}>
                    {expandedId === `coach-${coach.id}` && (
                      <Motion.tr
                        key={coach.id}
                        className="overflow-hidden border-b border-jmuDarkGold bg-jmuLightGold/25"
                        layout
                        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                      >
                        <td colSpan="2" className="p-0">
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
                                src={buildStoragePublicUrl(coach.headshot_url) || logoPurple}
                                alt={coach.name}
                                className="h-56 w-40 rounded-lg border border-jmuDarkGold object-cover"
                              />
                              <div className="flex flex-col justify-center text-jmuPurple">
                                {coach.bio && <p className="leading-relaxed text-jmuSlate">{coach.bio}</p>}
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
