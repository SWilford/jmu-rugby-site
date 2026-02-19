import { supabase } from "../lib/supabaseClient";

const JOIN_INFO_FALLBACK = {
  title: "Join JMU Men's Rugby",
  intro:
    "JMU Men's Rugby welcomes students at all experience levels who are prepared to train consistently, compete, and contribute to a team-first culture. If you are interested in joining, you can begin by attending practice and introducing yourself to the team.",
  cta: {
    email: "jmurugby@gmail.com",
    instagram: "https://www.instagram.com/jmumensrugby/",
  },
  schedule: [
    {
      label: "Tuesday/Thursday",
      detail: "5:30 PM - 7:00 PM",
    },
    {
      label: "Monday/Wednesday",
      detail: "Conditioning sessions; players choose either a morning or afternoon option.",
    },
    {
      label: "Friday",
      detail: "Player-driven walkthroughs; Friday afternoon.",
    },
    {
      label: "Saturday",
      detail: "Games",
    },
  ],
  travel:
    "Travel arrangements vary by match and distance; transportation may include UREC vans or player-owned cars, and certain events may require overnight hotel stays.",
  dues: "$200",
  seasons: [
    "Fall focuses on 15s with A side, B side, and Developmental.",
    "Spring focuses on 7s, and others also play 15s.",
  ],
  gear: [
    "Mouthguards are required.",
    "Cleats and rugby shorts are recommended.",
    "Lifting is on your own, but is recommended to get stronger.",
  ],
  eligibility:
    "Anyone can join; no experience is required. We will teach fundamentals, build fitness, and help you develop as a rugby player.",
};

const SETTINGS_TO_JOIN_INFO = {
  dues: "dues",
  travel: "travel",
  who_can_join: "eligibility",
};

function mapSettingsToJoinInfo(settingsRows) {
  return settingsRows.reduce((joinInfo, row) => {
    const targetKey = SETTINGS_TO_JOIN_INFO[row.key];

    if (targetKey) {
      joinInfo[targetKey] = row.value;
    }

    if (row.key === "fall_season") {
      joinInfo.seasons[0] = row.value;
    }

    if (row.key === "spring_season") {
      joinInfo.seasons[1] = row.value;
    }

    if (row.key === "conditioning") {
      const conditioningRow = joinInfo.schedule.find((item) => item.label === "Conditioning");

      if (conditioningRow) {
        conditioningRow.detail = row.value;
      }
    }

    if (row.key === "required_gear") {
      joinInfo.gear[0] = `${row.value} are required.`;
    }

    if (row.key === "recommended_gear") {
      joinInfo.gear[1] = `${row.value} are recommended.`;
    }

    if (row.key === "lifting") {
      joinInfo.gear[2] = row.value;
    }

    return joinInfo;
  }, structuredClone(JOIN_INFO_FALLBACK));
}

export async function getJoinInfo() {
  const [settingsResponse, scheduleResponse] = await Promise.all([
    supabase.from("join_content_settings").select("key, value"),
    supabase.from("join_content_schedule").select("label, detail").order("display_order", { ascending: true }),
  ]);

  if (settingsResponse.error || scheduleResponse.error) {
    console.error("Failed to load dynamic join content", {
      settingsError: settingsResponse.error,
      scheduleError: scheduleResponse.error,
    });

    return JOIN_INFO_FALLBACK;
  }

  const joinInfo = mapSettingsToJoinInfo(settingsResponse.data ?? []);

  if (Array.isArray(scheduleResponse.data) && scheduleResponse.data.length > 0) {
    joinInfo.schedule = scheduleResponse.data;
  }

  return joinInfo;
}

export default JOIN_INFO_FALLBACK;
