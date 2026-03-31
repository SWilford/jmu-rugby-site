import React, { useState } from "react";
import RosterTable from "../components/Team/RosterTable";
import CoachList from "../components/Team/CoachList";

export default function Team() {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="page-shell grow pt-8">
      <div className="w-full max-w-6xl space-y-8">
        <RosterTable expandedId={expandedId} setExpandedId={setExpandedId} />
        <CoachList expandedId={expandedId} setExpandedId={setExpandedId} />
      </div>
    </div>
  );
}
