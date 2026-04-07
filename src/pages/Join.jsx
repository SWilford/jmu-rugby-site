import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import JoinFaqAccordion from "../components/Join/JoinFaqAccordion";
import JoinMediaPlaceholders from "../components/Join/JoinMediaPlaceholders";
import JOIN_INFO_FALLBACK, { getJoinInfo } from "../data/joinInfo";
import { supabase } from "../lib/supabaseClient";
import { getMediaFilePath, MEDIA_JOIN_PAGE_COLUMNS } from "../lib/mediaUtils";
import { motion as Motion } from "framer-motion";

const MAX_JOIN_MEDIA_IMAGES = 3;

const mediaSlotConfig = {
  video: {
    title: "Highlight Video",
    src: "/videos/join-highlight.mp4",
    poster: "/videos/join-highlight.jpg",
    type: "video/mp4",
    credit: {
      label: "Video by Moses Tindall Visual Media",
      instagram: "https://www.instagram.com/moses_tindallvisualmedia/",
      linktree:
        "https://linktr.ee/mtvm?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQMMjU2MjgxMDQwNTU4AAGnEkX9euJdqZnVHXoOIbfw3l-j4K-ChLJFUWIeq97l0vw3fRREAsRxzoLXIbw_aem_16Asl3Kx0RnKK9DyNHnheQ",
    },
  },
  galleryPlaceholders: [
    { id: "gallery-1", label: "Photo Placeholder 1" },
    { id: "gallery-2", label: "Photo Placeholder 2" },
    { id: "gallery-3", label: "Photo Placeholder 3" },
  ],
};

export default function Join() {
  const [joinInfo, setJoinInfo] = useState(null);
  const [joinInfoLoading, setJoinInfoLoading] = useState(true);
  const [joinInfoError, setJoinInfoError] = useState("");
  const [joinGalleryImages, setJoinGalleryImages] = useState([]);
  const [joinGalleryLoading, setJoinGalleryLoading] = useState(true);
  const [joinGalleryError, setJoinGalleryError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadJoinInfo() {
      setJoinInfoLoading(true);
      setJoinInfoError("");

      try {
        const info = await getJoinInfo({ throwOnError: true });
        if (isMounted) {
          setJoinInfo(info);
        }
      } catch (error) {
        console.error("Join page content fetch error:", error);
        if (isMounted) {
          setJoinInfo(JOIN_INFO_FALLBACK);
          setJoinInfoError("Unable to load latest join details right now. Showing default information.");
        }
      } finally {
        if (isMounted) {
          setJoinInfoLoading(false);
        }
      }
    }

    async function loadJoinGalleryImages() {
      setJoinGalleryLoading(true);
      setJoinGalleryError("");

      try {
        let joinPageColumn = "";

        for (const columnName of MEDIA_JOIN_PAGE_COLUMNS) {
          const { error: columnError } = await supabase.from("media").select(columnName).limit(1);
          if (!columnError) {
            joinPageColumn = columnName;
            break;
          }
        }

        if (!joinPageColumn) {
          if (isMounted) {
            setJoinGalleryImages([]);
          }
          return;
        }

        const { data, error } = await supabase
          .from("media")
          .select("*")
          .eq(joinPageColumn, true)
          .order("id", { ascending: false })
          .limit(MAX_JOIN_MEDIA_IMAGES);

        if (error) throw error;

        const resolved = (data || [])
          .map((row) => ({
            id: row.id,
            src: getMediaFilePath(row),
            alt: row.album ? `${row.album} join page photo` : "JMU Rugby join page photo",
          }))
          .filter((row) => Boolean(row.src));

        if (isMounted) {
          setJoinGalleryImages(resolved);
        }
      } catch (error) {
        console.error("Join page gallery fetch error:", error);
        if (isMounted) {
          setJoinGalleryImages([]);
          setJoinGalleryError("Unable to load Join page photos right now.");
        }
      } finally {
        if (isMounted) {
          setJoinGalleryLoading(false);
        }
      }
    }

    loadJoinInfo();
    loadJoinGalleryImages();

    return () => {
      isMounted = false;
    };
  }, []);

  if (joinInfoLoading || !joinInfo) {
    return (
      <div className="surface-card mt-8 p-8">
        <p>Loading join information...</p>
      </div>
    );
  }

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="page-shell pt-6 sm:pt-8"
    >
      <section className="surface-card p-5 sm:p-8">
        <h1 className="mb-3 text-2xl font-bold sm:text-4xl">{joinInfo.title}</h1>
        <p className="text-base leading-relaxed text-jmuSlate sm:text-lg">{joinInfo.intro}</p>
        {joinInfoError && (
          <div className="mt-4 rounded border border-red-300 bg-red-100/20 px-4 py-3 text-sm text-red-800">
            {joinInfoError}
          </div>
        )}
      </section>

      <JoinMediaPlaceholders
        video={mediaSlotConfig.video}
        galleryPlaceholders={mediaSlotConfig.galleryPlaceholders}
        galleryImages={joinGalleryImages}
        isGalleryLoading={joinGalleryLoading}
        galleryError={joinGalleryError}
      />

      <section id="practice-schedule" className="surface-card mt-6 p-5 sm:p-8">
        <h2 className="mb-5 text-xl font-bold sm:text-2xl">Practice &amp; Season Details</h2>

        <div className="space-y-6 md:hidden">
          <article>
            <h3 className="mb-3 text-lg font-bold">Weekly Schedule</h3>
            <ul className="space-y-2">
              {joinInfo.schedule.map((slot) => (
                <li key={slot.label} className="surface-card-soft rounded-lg p-3">
                  <p className="text-sm font-semibold sm:text-base">{slot.label}</p>
                  <p className="text-sm text-jmuSlate">{slot.detail}</p>
                </li>
              ))}
            </ul>
          </article>

          <article className="space-y-3">
            <div className="surface-card-soft rounded-lg p-4">
              <h3 className="mb-1 text-lg font-bold">Dues</h3>
              <p className="text-base font-semibold text-jmuSlate">{joinInfo.dues}</p>
            </div>

            <div className="surface-card-soft rounded-lg p-4">
              <h3 className="mb-1 text-lg font-bold">Travel</h3>
              <p className="text-sm text-jmuSlate">{joinInfo.travel}</p>
            </div>

            <div className="surface-card-soft rounded-lg p-4">
              <h3 className="mb-2 text-lg font-bold">Seasons</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-jmuSlate">
                {joinInfo.seasons.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </article>
        </div>

        <div className="hidden grid-cols-1 gap-6 md:grid md:grid-cols-2">
          <article>
            <h3 className="mb-3 text-xl font-bold">Weekly Schedule</h3>
            <ul className="space-y-2">
              {joinInfo.schedule.map((slot) => (
                <li key={slot.label} className="surface-card-soft rounded-lg p-3">
                  <p className="font-semibold">{slot.label}</p>
                  <p className="text-jmuSlate">{slot.detail}</p>
                </li>
              ))}
            </ul>
          </article>

          <article className="space-y-4">
            <div className="surface-card-soft rounded-lg p-4">
              <h3 className="mb-1 text-xl font-bold">Dues</h3>
              <p className="text-lg font-semibold text-jmuSlate">{joinInfo.dues}</p>
            </div>

            <div className="surface-card-soft rounded-lg p-4">
              <h3 className="mb-1 text-xl font-bold">Travel</h3>
              <p className="text-jmuSlate">{joinInfo.travel}</p>
            </div>

            <div className="surface-card-soft rounded-lg p-4">
              <h3 className="mb-2 text-xl font-bold">Seasons</h3>
              <ul className="list-disc space-y-1 pl-5 text-jmuSlate">
                {joinInfo.seasons.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </section>

      <section className="surface-card mt-6 p-5 sm:p-8">
        <h2 className="mb-4 text-xl font-bold sm:text-2xl">Gear &amp; Expectations</h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed text-sm text-jmuSlate sm:pl-6 sm:text-base">
          {joinInfo.gear.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-jmuSlate sm:text-base">{joinInfo.eligibility}</p>
      </section>

      <section className="surface-card mb-4 mt-6 p-5 sm:p-8">
        <h2 className="mb-5 text-xl font-bold sm:text-2xl">FAQs</h2>
        <JoinFaqAccordion faqs={joinInfo.faqs} />

        <div className="mt-8 border-t border-jmuDarkGold/70 pt-6">
          <h3 className="mb-3 text-lg font-bold sm:text-xl">Have further questions?</h3>
          <Link to="/contact" className="brand-button px-5 py-2">
            Contact
          </Link>
        </div>
      </section>
    </Motion.div>
  );
}
