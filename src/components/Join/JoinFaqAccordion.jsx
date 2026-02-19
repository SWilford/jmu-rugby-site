import { useState } from "react";

export default function JoinFaqAccordion({ faqs }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index;

        return (
          <article key={faq.question} className="border border-jmuDarkGold rounded-md bg-jmuLightGold/20">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
              className="w-full px-5 py-4 text-left flex items-center justify-between gap-4"
            >
              <span className="font-semibold text-lg">{faq.question}</span>
              <span className="text-jmuDarkGold text-sm">{isOpen ? "▲" : "▼"}</span>
            </button>

            {isOpen && (
              <div className="px-5 pb-5 text-jmuPurple/90 leading-relaxed">
                {faq.answer}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
