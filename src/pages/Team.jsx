import React, { useState } from "react";
import RosterTable from "../components/Team/RosterTable";
import CoachList from "../components/Team/CoachList";

export default function Team() {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="w-full flex flex-col items-center pt-8 grow">
      <div className="w-full max-w-6xl flex flex-col gap-8">
        <RosterTable expandedId={expandedId} setExpandedId={setExpandedId} />
        <CoachList expandedId={expandedId} setExpandedId={setExpandedId} />
      </div>
    </div>
  );
}
