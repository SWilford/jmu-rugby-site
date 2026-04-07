import React, { useState } from "react";
import RosterTable from "../components/Team/RosterTable";
import CoachList from "../components/Team/CoachList";
import { motion as Motion } from "framer-motion";

export default function Team() {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="page-shell grow pt-8"
    >
      <div className="w-full max-w-6xl space-y-8">
        <RosterTable expandedId={expandedId} setExpandedId={setExpandedId} />
        <CoachList expandedId={expandedId} setExpandedId={setExpandedId} />
      </div>
    </Motion.div>
  );
}
