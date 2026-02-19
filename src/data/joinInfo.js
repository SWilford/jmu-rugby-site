const JOIN_INFO = {
  title: "Join JMU Men's Rugby",
  intro:
    "Whether you've played for years or you're brand new to the sport, there's a place for you here. Come train with us, compete at a high level, and be part of a tight-knit team culture.",
  cta: {
    email: "jmurugby@gmail.com",
    instagram: "https://www.instagram.com/jmumensrugby/",
  },
  schedule: [
    {
      label: "Tuesday/Thursday",
      detail: "5:30 PM – 7:00 PM",
    },
    {
      label: "Monday/Wednesday",
      detail: "Conditioning (players choose morning or afternoon)",
    },
    {
      label: "Friday",
      detail: "Player-driven walkthroughs (Friday afternoon)",
    },
    {
      label: "Saturday",
      detail: "Games",
    },
  ],
  travel:
    "Sometimes UREC vans, sometimes player-owned cars; sometimes overnight hotel stays depending on distance/event.",
  dues: "$200",
  seasons: [
    "Fall focuses on 15s with A side, B side, and Developmental.",
    "Spring focuses on 7s, and others also play 15s.",
    "Compete in NCR, MARC, etc.",
  ],
  gear: [
    "Mouthguard is required.",
    "Cleats + rugby shorts recommended.",
    "Lifting is on your own, but recommended to get stronger.",
  ],
  eligibility:
    "Basically anyone can join. No experience is required — we'll teach you the game and get you fit.",
};

export async function getJoinInfo() {
  // TODO: Replace with Supabase join_settings fetch when admin panel is implemented.
  return JOIN_INFO;
}

export default JOIN_INFO;
