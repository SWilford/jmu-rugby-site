import { Link } from "react-router-dom";

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
    <div className="w-full flex flex-col items-center px-4 sm:px-6">
      <section className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-8 mt-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">About JMU Men&apos;s Rugby</h1>
        <p className="uppercase tracking-widest text-jmuDarkGold font-semibold mb-6">
          Fifteen • As • One
        </p>
        <p className="leading-relaxed text-lg">
          JMU Men&apos;s Rugby is a competitive brotherhood built on standards, work ethic,
          and commitment. We compete to win, represent James Madison University with
          pride, and develop men who are dependable on and off the pitch.
        </p>
      </section>

      <section className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-8 mt-8">
        <h2 className="text-2xl font-bold mb-4">Program History</h2>
        <p className="leading-relaxed mb-4">
          Founded in 1974, JMU Men&apos;s Rugby has a long tradition of physical, disciplined,
          and team-first rugby. Generations of Dukes have helped build a culture centered
          on respect, consistency, and competitive pride.
        </p>
        <p className="leading-relaxed">
          Our history is more than results and competition; it's the standard each class leaves behind for
          the next. Every season adds to that legacy.
        </p>
      </section>

      <section className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-8 mt-8">
        <h2 className="text-2xl font-bold mb-6">Core Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coreValues.map((value) => (
            <article key={value.title} className="border border-jmuDarkGold rounded-md p-5 bg-jmuLightGold/30">
              <h3 className="text-xl font-bold mb-2">{value.title}</h3>
              <p className="leading-relaxed">{value.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-8 mt-8">
        <h2 className="text-2xl font-bold mb-4">What to Expect</h2>
        <p className="leading-relaxed mb-4">
          Our fall season is focused on 15s, while spring emphasizes 7s competition.
          Players are expected to train consistently, communicate clearly, and take
          ownership of their development.
        </p>
        <p className="leading-relaxed">
          Whether you are new to rugby or an experienced player, you will be challenged,
          supported, and pushed to improve by teammates and coaches who care about your
          growth.
        </p>
      </section>

      <section className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-8 mt-8 mb-4">
        <h2 className="text-2xl font-bold mb-4">Be Part of the Program</h2>
        <p className="leading-relaxed mb-6">
          Interested in competing for JMU Men&apos;s Rugby? See what&apos;s ahead and take the
          next step.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/join"
            className="border-2 border-jmuPurple text-jmuPurple px-6 py-3 rounded-md font-semibold hover:bg-jmuPurple hover:text-jmuLightGold transition-colors"
          >
            Join the Team
          </Link>
          <Link
            to="/schedule"
            className="border-2 border-jmuDarkGold text-jmuDarkGold px-6 py-3 rounded-md font-semibold hover:bg-jmuDarkGold hover:text-jmuOffWhite transition-colors"
          >
            View Schedule
          </Link>
        </div>
      </section>
    </div>
  );
}
