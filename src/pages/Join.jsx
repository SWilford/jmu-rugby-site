import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import JoinFaqAccordion from "../components/Join/JoinFaqAccordion";
import JoinMediaPlaceholders from "../components/Join/JoinMediaPlaceholders";
import { getJoinInfo } from "../data/joinInfo";

const faqItems = [
  {
    question: "Do I need experience?",
    answer:
      "No experience is required. JMU Men's Rugby welcomes beginners and experienced players, and our training structure is designed to teach fundamentals while improving fitness.",
  },
  {
    question: "What should I bring?",
    answer:
      "Bring water and training gear. A mouthguard is required, and cleats plus rugby shorts are recommended.",
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
];

const mediaSlotConfig = {
  videoPlaceholderLabel: "Video embed placeholder",
  galleryPlaceholders: [
    { id: "gallery-1", label: "Photo Placeholder 1" },
    { id: "gallery-2", label: "Photo Placeholder 2" },
    { id: "gallery-3", label: "Photo Placeholder 3" },
  ],
};

export default function Join() {
  const [joinInfo, setJoinInfo] = useState(null);

  useEffect(() => {
    async function loadJoinInfo() {
      const info = await getJoinInfo();
      setJoinInfo(info);
    }

    loadJoinInfo();
  }, []);

  if (!joinInfo) {
    return (
      <div className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-8 mt-8">
        <p>Loading join information...</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center px-4 sm:px-6">
      <section className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-8 mt-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">{joinInfo.title}</h1>
        <p className="leading-relaxed text-lg mb-6">{joinInfo.intro}</p>

      </section>

      <JoinMediaPlaceholders
        videoPlaceholderLabel={mediaSlotConfig.videoPlaceholderLabel}
        galleryPlaceholders={mediaSlotConfig.galleryPlaceholders}
      />

      <section
        id="practice-schedule"
        className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-8 mt-8"
      >
        <h2 className="text-2xl font-bold mb-5">Practice & Season Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <article>
            <h3 className="text-xl font-bold mb-3">Weekly Schedule</h3>
            <ul className="space-y-2">
              {joinInfo.schedule.map((slot) => (
                <li key={slot.label} className="border border-jmuDarkGold rounded-md p-3 bg-jmuLightGold/20">
                  <p className="font-semibold">{slot.label}</p>
                  <p>{slot.detail}</p>
                </li>
              ))}
            </ul>
          </article>

          <article className="space-y-4">
            <div className="border border-jmuDarkGold rounded-md p-4 bg-jmuLightGold/20">
              <h3 className="text-xl font-bold mb-1">Dues</h3>
              <p className="text-lg font-semibold">{joinInfo.dues}</p>
            </div>

            <div className="border border-jmuDarkGold rounded-md p-4 bg-jmuLightGold/20">
              <h3 className="text-xl font-bold mb-1">Travel</h3>
              <p>{joinInfo.travel}</p>
            </div>

            <div className="border border-jmuDarkGold rounded-md p-4 bg-jmuLightGold/20">
              <h3 className="text-xl font-bold mb-2">Seasons</h3>
              <ul className="list-disc pl-5 space-y-1">
                {joinInfo.seasons.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </section>

      <section className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-8 mt-8">
        <h2 className="text-2xl font-bold mb-4">Gear & Expectations</h2>
        <ul className="list-disc pl-6 space-y-2 leading-relaxed">
          {joinInfo.gear.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-4 leading-relaxed">{joinInfo.eligibility}</p>
      </section>

      <section className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-8 mt-8 mb-4">
        <h2 className="text-2xl font-bold mb-5">FAQ's</h2>
        <JoinFaqAccordion faqs={faqItems} />

        <div className="border-t border-jmuDarkGold mt-8 pt-6">
          <h3 className="text-xl font-bold mb-3">Have further questions?</h3>
          <Link
            to="/contact"
            className="inline-flex border-2 border-jmuPurple text-jmuPurple px-5 py-2 rounded-md font-semibold hover:bg-jmuDarkGold hover:text-jmuOffWhite transition-colors"
          >
            Contact
          </Link>
        </div>
      </section>
    </div>
  );
}
