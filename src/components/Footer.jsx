import { useEffect, useState } from "react";
import { getSponsors } from "../data/sponsors";

export default function Footer() {
  const [sponsors, setSponsors] = useState([]);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    async function loadSponsors() {
      const sponsorRows = await getSponsors();
      setSponsors(sponsorRows);
    }

    loadSponsors();
  }, []);

  return (
    <footer className="site-footer mt-12 w-full bg-jmuPurple text-jmuGold font-arvo shadow-[0_-8px_30px_rgba(24,0,46,0.3)]">
      <div className="mx-auto w-full max-w-6xl border-t border-jmuDarkGold/30 px-4 pb-8 pt-8 text-center sm:px-6">
        <section className="mb-8 flex flex-col items-center">
          <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-jmuLightGold/80 sm:text-sm">
            JMU Men&apos;s Rugby Club Is Proudly Sponsored By
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {sponsors.map((sponsor) => {
              const content = sponsor.logo_url ? (
                <img
                  src={sponsor.logo_url}
                  alt={sponsor.alt_text || `${sponsor.name} logo`}
                  className="h-12 w-auto object-contain sm:h-16 opacity-90 transition-opacity hover:opacity-100 drop-shadow-md"
                  loading="lazy"
                />
              ) : (
                <span className="text-sm font-bold sm:text-base text-jmuLightGold">{sponsor.name}</span>
              );

              if (sponsor.website_url) {
                return (
                  <a
                    key={sponsor.id}
                    href={sponsor.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="sponsor-item inline-flex items-center transition-transform hover:scale-110 duration-300"
                  >
                    {content}
                  </a>
                );
              }

              return (
                <div key={sponsor.id} className="sponsor-item inline-flex items-center">
                  {content}
                </div>
              );
            })}
          </div>

          {sponsors.length === 0 && (
            <p className="text-xs text-jmuLightGold/60 italic sm:text-sm mt-4">Sponsor logos coming soon.</p>
          )}
        </section>

        <div className="border-t border-jmuDarkGold/20 pt-6">
          <p className="text-xs tracking-wider text-jmuLightGold/70">
            &copy; {currentYear} JMU Men&apos;s Rugby Club | Fifteen as One
          </p>
        </div>
      </div>
    </footer>
  );
}
