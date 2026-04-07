import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { motion as Motion } from "framer-motion";

const FALLBACK_CONTACT_CARDS = [
  {
    id: "fallback-president",
    label: "Club President",
    value: "madisonrugbypresident@gmail.com",
    contact_type: "email",
    cta_label: "",
    display_order: 1,
    is_active: true,
  },
  {
    id: "fallback-coach",
    label: "Head Coach Mark Fowler",
    value: "Fowlerma@alumni.vcu.edu",
    contact_type: "email",
    cta_label: "",
    display_order: 2,
    is_active: true,
  },
  {
    id: "fallback-instagram",
    label: "Instagram",
    value: "https://www.instagram.com/jmumensrugby/",
    contact_type: "url",
    cta_label: "Visit @jmumensrugby",
    display_order: 3,
    is_active: true,
  },
];

const normalizeText = (value) => String(value || "").trim();

const normalizeContactType = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  return ["email", "url", "phone", "text"].includes(normalized) ? normalized : "text";
};

const normalizeUrl = (value) => {
  const raw = normalizeText(value);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
};

const buildCardAction = (card) => {
  const contactType = normalizeContactType(card.contact_type);
  const ctaLabel = normalizeText(card.cta_label);

  if (contactType === "email") {
    return {
      href: `mailto:${card.value}`,
      label: ctaLabel || "Open Email",
      isExternal: false,
    };
  }

  if (contactType === "url") {
    const href = normalizeUrl(card.value);
    if (!href) return null;
    return {
      href,
      label: ctaLabel || "Open Link",
      isExternal: true,
    };
  }

  if (contactType === "phone") {
    return {
      href: `tel:${card.value}`,
      label: ctaLabel || "Call",
      isExternal: false,
    };
  }

  return null;
};

export default function Contact() {
  const [cards, setCards] = useState(FALLBACK_CONTACT_CARDS);
  const [loading, setLoading] = useState(true);
  const [copiedValue, setCopiedValue] = useState("");
  const [copyError, setCopyError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadContactCards = async () => {
      const { data, error } = await supabase
        .from("contact_cards")
        .select("id, label, value, contact_type, cta_label, display_order, is_active")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("id", { ascending: true });

      if (!isMounted) return;

      if (error) {
        console.error("Contact page fallback: failed to load contact_cards", error);
        setCards(FALLBACK_CONTACT_CARDS);
        setLoading(false);
        return;
      }

      if (Array.isArray(data) && data.length > 0) {
        setCards(data);
      } else {
        setCards(FALLBACK_CONTACT_CARDS);
      }

      setLoading(false);
    };

    loadContactCards();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleCards = useMemo(
    () =>
      cards
        .filter((card) => Boolean(card.is_active))
        .map((card) => ({
          ...card,
          label: normalizeText(card.label),
          value: normalizeText(card.value),
          contact_type: normalizeContactType(card.contact_type),
          cta_label: normalizeText(card.cta_label),
        })),
    [cards]
  );

  const handleCopy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      setCopyError("");
      setTimeout(() => setCopiedValue(""), 2000);
    } catch {
      setCopyError("Copy failed. Please copy this value manually.");
    }
  };

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="page-shell pt-8"
    >
      <section className="surface-card p-6 sm:p-8">
        <h1 className="mb-3 text-3xl font-bold sm:text-4xl">Contact JMU Men&apos;s Rugby</h1>
        <p className="text-lg leading-relaxed text-jmuSlate">
          If you have questions about the team, recruiting, matches, or anything else, reach out using
          the contact options below.
        </p>
      </section>

      <section className="surface-card mb-4 mt-8 p-6 sm:p-8">
        <h2 className="mb-5 text-center text-2xl font-bold">Get In Touch</h2>

        {loading ? (
          <p className="text-center text-jmuDarkGold">Loading contact cards...</p>
        ) : visibleCards.length === 0 ? (
          <p className="text-center text-jmuDarkGold">Contact options will appear here soon.</p>
        ) : (
          <div className="space-y-4 text-center">
            {visibleCards.map((card) => {
              const action = buildCardAction(card);
              return (
                <article key={card.id} className="surface-card-soft rounded-lg p-4 transition-transform hover:-translate-y-1">
                  <p className="mb-1 font-semibold text-jmuPurple">{card.label}</p>
                  <p className="mb-3 break-all text-jmuDarkGold">{card.value}</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button type="button" onClick={() => handleCopy(card.value)} className="brand-button px-4 py-2">
                      {copiedValue === card.value ? "Copied" : "Copy"}
                    </button>

                    {action && (
                      <a
                        href={action.href}
                        target={action.isExternal ? "_blank" : undefined}
                        rel={action.isExternal ? "noreferrer" : undefined}
                        className="brand-button px-4 py-2"
                      >
                        {action.label}
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {copyError && <p className="mt-4 font-semibold text-red-700">{copyError}</p>}
      </section>
    </Motion.div>
  );
}
