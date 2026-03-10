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
    <footer className="bg-jmuPurple text-jmuGold font-arvo text-center py-6">
      <div className="max-w-6xl mx-auto border-t border-jmuDarkGold pt-4 px-4">
        <section className="mb-5">
            <p className="text-sm sm:text-base font-semibold text-jmuLightGold mb-3">
              JMU Men's Rugby is proudly sponsored by
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {sponsors.map((sponsor) => {
                const content = sponsor.logo_url ? (
                  <img
                    src={sponsor.logo_url}
                    alt={sponsor.alt_text || `${sponsor.name} logo`}
                    className="h-16 sm:h-20 w-auto object-contain"
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
                      className="inline-flex items-center"
                    >
                      {content}
                    </a>
                  );
                }

                return (
                  <div key={sponsor.id} className="inline-flex items-center">
                    {content}
                  </div>
                );
              })}
            </div>
          {sponsors.length === 0 && (
            <p className="text-xs sm:text-sm text-jmuLightGold/80">
              Sponsor logos coming soon.
            </p>
          )}
        </section>

        <p className="text-sm">© JMU Men’s Rugby • Fifteen as One</p>
      </div>
    </footer>
  );
}
