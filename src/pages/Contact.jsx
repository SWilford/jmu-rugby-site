import { useState } from "react";

const contacts = [
  {
    label: "President's Email",
    value: "madisonrugbypresident@gmail.com",
  },
  {
    label: "Head Coach Mark Fowler's Email",
    value: "Fowlerma@alumni.vcu.edu",
  },
];

const instagramUrl = "https://www.instagram.com/jmumensrugby/";

export default function Contact() {
  const [copiedEmail, setCopiedEmail] = useState("");
  const [copyError, setCopyError] = useState("");

  const handleCopy = async (email) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setCopyError("");
      setTimeout(() => setCopiedEmail(""), 2000);
    } catch {
      setCopyError("Copy failed. Please copy the email manually.");
    }
  };

  return (
    <div className="w-full flex flex-col items-center px-4 sm:px-6">
      <section className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-8 mt-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Contact JMU Men&apos;s Rugby</h1>
        <p className="text-lg leading-relaxed">
          If you have questions about the team, recruiting, matches, or anything else,
          reach out using the contact options below.
        </p>
      </section>

      <section className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-8 mt-8 mb-4">
        <h2 className="text-2xl font-bold mb-5">Get In Touch</h2>

        <div className="space-y-4 mb-8">
          {contacts.map((contact) => (
            <article
              key={contact.value}
              className="border border-jmuDarkGold rounded-md p-4 bg-jmuLightGold/20"
            >
              <p className="font-semibold text-jmuPurple mb-1">{contact.label}</p>
              <p className="break-all text-jmuDarkGold mb-3">{contact.value}</p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleCopy(contact.value)}
                  className="border-2 border-jmuPurple text-jmuPurple px-4 py-2 rounded-md font-semibold hover:bg-jmuPurple hover:text-jmuLightGold transition-colors"
                >
                  {copiedEmail === contact.value ? "Copied" : "Copy Email"}
                </button>
                <a
                  href={`mailto:${contact.value}`}
                  className="border-2 border-jmuDarkGold text-jmuDarkGold px-4 py-2 rounded-md font-semibold hover:bg-jmuDarkGold hover:text-jmuOffWhite transition-colors"
                >
                  Open Email
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className="border-t border-jmuDarkGold pt-6">
          <p className="font-semibold mb-3">Instagram</p>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex border-2 border-jmuGold text-jmuPurple bg-jmuGold px-5 py-2 rounded-md font-semibold hover:bg-jmuLightGold transition-colors"
          >
            Visit @jmumensrugby
          </a>
        </div>

        {copyError && <p className="mt-4 text-red-700 font-semibold">{copyError}</p>}
      </section>
    </div>
  );
}
