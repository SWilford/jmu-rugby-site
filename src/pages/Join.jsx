import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import JoinFaqAccordion from "../components/Join/JoinFaqAccordion";
import JoinMediaPlaceholders from "../components/Join/JoinMediaPlaceholders";
import { getJoinInfo } from "../data/joinInfo";
import { supabase } from "../lib/supabaseClient";
import { getMediaFilePath, MEDIA_JOIN_PAGE_COLUMNS } from "../lib/mediaUtils";

const MAX_JOIN_MEDIA_IMAGES = 3;

const mediaSlotConfig = {
  videoPlaceholderLabel: "Video embed placeholder",
  galleryPlaceholders: [
    { id: "gallery-1", label: "Photo Placeholder 1" },
    { id: "gallery-2", label: "Photo Placeholder 2" },
    { id: "gallery-3", label: "Photo Placeholder 3" },
  ],
};

export default function Join() {
  const [joinInfo, setJoinInfo] = useState(null);
  const [joinGalleryImages, setJoinGalleryImages] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function loadJoinInfo() {
      const info = await getJoinInfo();
      if (isMounted) {
        setJoinInfo(info);
      }
    }

    async function loadJoinGalleryImages() {
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
          if (isMounted) setJoinGalleryImages([]);
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
        }
      }
    }

    loadJoinInfo();
    loadJoinGalleryImages();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!joinInfo) {
    return (
      <div className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-8 mt-8">
        <p>Loading join information...</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center px-4 sm:px-6">
      <section className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-8 mt-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">{joinInfo.title}</h1>
        <p className="leading-relaxed text-lg">{joinInfo.intro}</p>

      </section>

      <JoinMediaPlaceholders
        videoPlaceholderLabel={mediaSlotConfig.videoPlaceholderLabel}
        galleryPlaceholders={mediaSlotConfig.galleryPlaceholders}
        galleryImages={joinGalleryImages}
      />

      <section
        id="practice-schedule"
        className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-8 mt-8"
      >
        <h2 className="text-2xl font-bold mb-5">Practice & Season Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <article>
            <h3 className="text-xl font-bold mb-3">Weekly Schedule</h3>
            <ul className="space-y-2">
              {joinInfo.schedule.map((slot) => (
                <li key={slot.label} className="border border-jmuDarkGold rounded-md p-3 bg-jmuLightGold/20">
                  <p className="font-semibold">{slot.label}</p>
                  <p>{slot.detail}</p>
                </li>
              ))}
            </ul>
          </article>

          <article className="space-y-4">
            <div className="border border-jmuDarkGold rounded-md p-4 bg-jmuLightGold/20">
              <h3 className="text-xl font-bold mb-1">Dues</h3>
              <p className="text-lg font-semibold">{joinInfo.dues}</p>
            </div>

            <div className="border border-jmuDarkGold rounded-md p-4 bg-jmuLightGold/20">
              <h3 className="text-xl font-bold mb-1">Travel</h3>
              <p>{joinInfo.travel}</p>
            </div>

            <div className="border border-jmuDarkGold rounded-md p-4 bg-jmuLightGold/20">
              <h3 className="text-xl font-bold mb-2">Seasons</h3>
              <ul className="list-disc pl-5 space-y-1">
                {joinInfo.seasons.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </section>

      <section className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-8 mt-8">
        <h2 className="text-2xl font-bold mb-4">Gear & Expectations</h2>
        <ul className="list-disc pl-6 space-y-2 leading-relaxed">
          {joinInfo.gear.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-4 leading-relaxed">{joinInfo.eligibility}</p>
      </section>

      <section className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-8 mt-8 mb-4">
        <h2 className="text-2xl font-bold mb-5">FAQ's</h2>
        <JoinFaqAccordion faqs={joinInfo.faqs} />

        <div className="border-t border-jmuDarkGold mt-8 pt-6">
          <h3 className="text-xl font-bold mb-3">Have further questions?</h3>
          <Link
            to="/contact"
            className="inline-flex border-2 border-jmuPurple text-jmuPurple px-5 py-2 rounded-md font-semibold hover:bg-jmuDarkGold hover:text-jmuOffWhite transition-colors"
          >
            Contact
          </Link>
        </div>
      </section>
    </div>
  );
}
