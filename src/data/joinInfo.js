const JOIN_INFO = {
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
    "Compete in NCR, MARC, etc.",
  ],
  gear: [
    "Mouthguard is required.",
    "Cleats + rugby shorts recommended.",
    "Lifting is on your own, but recommended to get stronger.",
  ],
  eligibility:
    "Anyone can join; no experience is required. We will teach fundamentals, build fitness, and help you develop as a rugby player.",
};

export async function getJoinInfo() {
  // TODO: Replace with Supabase join_settings fetch when admin panel is implemented.
  return JOIN_INFO;
}

export default JOIN_INFO;
