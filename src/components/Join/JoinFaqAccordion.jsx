import { useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";

export default function JoinFaqAccordion({ faqs }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index;

        return (
          <article key={faq.question} className="surface-card-soft overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-jmuLightGold/35"
            >
              <span className="text-lg font-semibold">{faq.question}</span>
              <span className="text-sm text-jmuDarkGold">{isOpen ? "^" : "v"}</span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <Motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.26, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 leading-relaxed text-jmuSlate">{faq.answer}</div>
                </Motion.div>
              )}
            </AnimatePresence>
          </article>
        );
      })}
    </div>
  );
}
