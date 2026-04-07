import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";

const coreValues = [
  {
    title: "Discipline",
    description:
      "We hold a high standard in preparation, attendance, and effort. Discipline is what turns hard training into consistent match-day performance.",
  },
  {
    title: "Teamwork",
    description:
      "Rugby is the ultimate team sport. We trust each other, communicate constantly, and play for the man next to us.",
  },
  {
    title: "Growth",
    description:
      "Every season is an opportunity to improve as athletes, students, and leaders. We value progress and development every day.",
  },
  {
    title: "Accountability",
    description:
      "We do what we say we will do. Every player is responsible to the team, to our culture, and to representing JMU the right way.",
  },
];

export default function About() {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="page-shell pt-8"
    >
      <section className="surface-card p-6 sm:p-8">
        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">About JMU Men&apos;s Rugby</h1>
        <p className="mb-6 text-sm font-semibold uppercase tracking-[0.28em] text-jmuDarkGold sm:text-base">
          Fifteen | As | One
        </p>
        <p className="text-lg leading-relaxed text-jmuSlate">
          JMU Men&apos;s Rugby is a competitive brotherhood built on standards, work ethic, and commitment.
          We compete to win, represent James Madison University with pride, and develop men who are
          dependable on and off the pitch.
        </p>
      </section>

      <section className="surface-card mt-8 p-6 sm:p-8">
        <h2 className="mb-4 text-2xl font-bold">Program History</h2>
        <p className="mb-4 leading-relaxed text-jmuSlate">
          Founded in 1974, JMU Men&apos;s Rugby has a long tradition of physical, disciplined, and team-first
          rugby. Generations of Dukes have helped build a culture centered on respect, consistency, and
          competitive pride.
        </p>
        <p className="leading-relaxed text-jmuSlate">
          Our history is more than results and competition; it&apos;s the standard each class leaves behind for
          the next. Every season adds to that legacy.
        </p>
      </section>

      <section className="surface-card mt-8 p-6 sm:p-8">
        <h2 className="mb-6 text-2xl font-bold">Core Values</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {coreValues.map((value) => (
            <article key={value.title} className="surface-card-soft p-5 transition hover:-translate-y-0.5">
              <h3 className="mb-2 text-xl font-bold">{value.title}</h3>
              <p className="leading-relaxed text-jmuSlate">{value.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="surface-card mt-8 p-6 sm:p-8">
        <h2 className="mb-4 text-2xl font-bold">What to Expect</h2>
        <p className="mb-4 leading-relaxed text-jmuSlate">
          Our fall season is focused on 15s, while spring emphasizes 7s competition. Players are expected
          to train consistently, communicate clearly, and take ownership of their development.
        </p>
        <p className="leading-relaxed text-jmuSlate">
          Whether you are new to rugby or an experienced player, you will be challenged, supported, and
          pushed to improve by teammates and coaches who care about your growth.
        </p>
      </section>

      <section className="surface-card mb-4 mt-8 p-6 sm:p-8">
        <h2 className="mb-4 text-2xl font-bold">Be Part of the Program</h2>
        <p className="mb-6 leading-relaxed text-jmuSlate">
          Interested in competing for JMU Men&apos;s Rugby? See what&apos;s ahead and take the next step.
        </p>
        <div className="flex flex-wrap gap-3 sm:gap-4">
          <Link to="/join" className="brand-button px-6 py-3">
            Join the Team
          </Link>
          <Link to="/schedule" className="brand-button px-6 py-3">
            View Schedule
          </Link>
        </div>
      </section>
    </Motion.div>
  );
}
