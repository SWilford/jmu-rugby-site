import { supabase } from "../lib/supabaseClient";

export const JOIN_INFO_FALLBACK = {
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
  faqs: [
    {
      question: "Do I need experience?",
      answer:
        "No experience is required. JMU Men's Rugby welcomes beginners and experienced players, and our training structure is designed to teach fundamentals while improving fitness.",
    },
    {
      question: "What should I bring?",
      answer:
        "Bring water and wear athletic clothing. A mouthguard is required, cleats and rugby shorts are highly recommended.",
    },
    {
      question: "How much does it cost?",
      answer: "Team dues are $200.",
    },
    {
      question: "How much time is the commitment?",
      answer:
        "The weekly schedule includes Tuesday and Thursday practices from 5:30 PM to 7:00 PM, Monday and Wednesday conditioning sessions, Friday afternoon walkthroughs, and Saturday games.",
    },
    {
      question: "Is lifting required?",
      answer:
        "Lifting is not a formal team requirement; however, it is strongly recommended for strength and on-field performance.",
    },
    {
      question: "What if I’ve never played a contact sport?",
      answer:
        "That is completely fine. Coaches and veteran players will help you learn techniques and contact fundamentals in a progressive, safe environment.",
    },
    {
      question: "How do games/travel work?",
      answer:
        "Travel depends on the opponent and event location; transportation may be by UREC vans or player-owned cars, and some trips include overnight hotel stays.",
    },
    {
      question: "What’s the difference between fall and spring season?",
      answer:
        "Fall focuses on 15s with A side, B side, and Developmental. Spring focuses on 7s, and others also play 15s. The team competes under National Collegiate Rugby (NCR) in the Mid-Atlantic Rugby Conference (MARC) at the DI-AA level.",
    },
    {
      question: "What day is Saturday?",
      answer: "SATURDAYS A RUGBY DAY!",
    },
  ],
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

export async function getJoinInfo(options = {}) {
  const { throwOnError = false } = options;

  const [settingsResponse, scheduleResponse, faqResponse] = await Promise.all([
    supabase.from("join_content_settings").select("key, value"),
    supabase.from("join_content_schedule").select("label, detail").order("display_order", { ascending: true }),
    supabase
      .from("join_content_faq")
      .select("question, answer")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
  ]);

  if (settingsResponse.error || scheduleResponse.error || faqResponse.error) {
    console.error("Failed to load dynamic join content", {
      settingsError: settingsResponse.error,
      scheduleError: scheduleResponse.error,
      faqError: faqResponse.error,
    });

    if (throwOnError) {
      const errors = [settingsResponse.error, scheduleResponse.error, faqResponse.error]
        .filter(Boolean)
        .map((error) => error.message || "Unknown join content error")
        .join(" | ");
      throw new Error(errors || "Failed to load dynamic join content.");
    }

    return JOIN_INFO_FALLBACK;
  }

  const joinInfo = mapSettingsToJoinInfo(settingsResponse.data ?? []);

  if (Array.isArray(scheduleResponse.data) && scheduleResponse.data.length > 0) {
    joinInfo.schedule = scheduleResponse.data;
  }

  if (Array.isArray(faqResponse.data) && faqResponse.data.length > 0) {
    joinInfo.faqs = faqResponse.data;
  }

  return joinInfo;
}

export default JOIN_INFO_FALLBACK;
