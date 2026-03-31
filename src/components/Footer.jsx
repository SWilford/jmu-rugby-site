import { useEffect, useState } from "react";
import { getSponsors } from "../data/sponsors";

export default function Footer() {
  const [sponsors, setSponsors] = useState([]);

  useEffect(() => {
    async function loadSponsors() {
      const sponsorRows = await getSponsors();
      setSponsors(sponsorRows);
    }

    loadSponsors();
  }, []);

  return (
    <footer className="mt-8 w-full bg-jmuPurple/50 text-jmuGold font-arvo">
      <div className="mx-auto w-full max-w-6xl border-t border-jmuDarkGold/85 px-4 pb-6 pt-5 text-center sm:px-6">
        <section className="mb-5 rounded-xl border border-jmuDarkGold/60 bg-jmuPurple/30 px-4 py-4">
          <p className="mb-4 text-sm font-semibold text-jmuLightGold sm:text-base">
            JMU Men's Rugby is proudly sponsored by
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {sponsors.map((sponsor) => {
              const content = sponsor.logo_url ? (
                <img
                  src={sponsor.logo_url}
                  alt={sponsor.alt_text || `${sponsor.name} logo`}
                  className="h-14 w-auto object-contain sm:h-20"
                  loading="lazy"
                />
              ) : (
                <span className="text-sm sm:text-base">{sponsor.name}</span>
              );

              if (sponsor.website_url) {
                return (
                  <a
                    key={sponsor.id}
                    href={sponsor.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-lg border border-transparent px-2 py-1 transition hover:border-jmuDarkGold/60 hover:bg-jmuPurple/35"
                  >
                    {content}
                  </a>
                );
              }

              return (
                <div key={sponsor.id} className="inline-flex items-center rounded-lg px-2 py-1">
                  {content}
                </div>
              );
            })}
          </div>

          {sponsors.length === 0 && (
            <p className="text-xs text-jmuLightGold/80 sm:text-sm">Sponsor logos coming soon.</p>
          )}
        </section>

        <p className="text-sm text-jmuLightGold/90"> © JMU Men's Rugby | Fifteen as One</p>
      </div>
    </footer>
  );
}


