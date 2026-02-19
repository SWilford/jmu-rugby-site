import { useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";

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

            <AnimatePresence initial={false}>
              {isOpen && (
                <Motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 text-jmuPurple/90 leading-relaxed">{faq.answer}</div>
                </Motion.div>
              )}
            </AnimatePresence>
          </article>
        );
      })}
    </div>
  );
}
