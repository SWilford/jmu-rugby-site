export default function JoinMediaPlaceholders({
  video,
  galleryPlaceholders,
  galleryImages = [],
  isGalleryLoading = false,
  galleryError = "",
}) {
  return (
    <section className="surface-card mt-8 p-5 sm:p-8">
      <h2 className="mb-3 text-xl font-bold sm:mb-4 sm:text-2xl">See the Team in Action</h2>
      <p className="mb-5 text-sm text-jmuSlate sm:mb-6 sm:text-base">
        Get a feel for our training, match intensity, and team culture.
      </p>

      {video?.src ? (
        <div className="mb-6 rounded-xl border border-jmuDarkGold/70 bg-jmuLightGold/40 p-4 sm:p-5">
          <p className="text-base font-semibold sm:text-lg">{video.title || "Highlight Video"}</p>
          <div className="video-hero-fallback-frame mt-3 overflow-hidden rounded-lg border border-jmuDarkGold/80 shadow-sm">
            <video
              controls
              playsInline
              preload="metadata"
              poster={video.poster || undefined}
              className="video-hero-fallback-player"
            >
              <source src={video.src} type={video.type || "video/mp4"} />
              Your browser does not support HTML5 video.
            </video>
          </div>
          {video.caption && <p className="mt-3 text-xs text-jmuSlate sm:text-sm">{video.caption}</p>}
          {video.credit && (
            <div className="mt-3 rounded-md border border-jmuDarkGold/60 bg-jmuLightGold/55 px-3 py-2 text-xs text-jmuSlate sm:text-sm">
              <p className="font-semibold">{video.credit.label}</p>
              <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-4">
                {video.credit.instagram && (
                  <a
                    href={video.credit.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-jmuPurple transition hover:text-jmuDarkGold"
                  >
                    Instagram
                  </a>
                )}
                {video.credit.linktree && (
                  <a
                    href={video.credit.linktree}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-jmuPurple transition hover:text-jmuDarkGold"
                  >
                    Linktree
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6 rounded-xl border-2 border-dashed border-jmuDarkGold bg-jmuLightGold/25 p-8 text-center">
          <p className="text-lg font-semibold">Highlight Video</p>
          <p className="mt-2 text-jmuDarkGold">Video placeholder</p>
        </div>
      )}

      {galleryError && (
        <div className="mb-4 rounded border border-red-300 bg-red-100/20 px-4 py-3 text-sm text-red-800">
          {galleryError}
        </div>
      )}

      {isGalleryLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {galleryPlaceholders.map((item) => (
            <div
              key={item.id}
              className="flex h-44 items-center justify-center rounded-lg border-2 border-dashed border-jmuDarkGold bg-jmuLightGold/35 px-4 text-center sm:h-36"
            >
              <span className="font-semibold text-jmuDarkGold">Loading photo...</span>
            </div>
          ))}
        </div>
      ) : galleryImages.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {galleryImages.map((item) => (
            <img
              key={item.id}
              src={item.src}
              alt={item.alt}
              className="h-44 w-full rounded-lg border border-jmuDarkGold object-cover shadow-sm sm:h-36"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {galleryPlaceholders.map((item) => (
            <div
              key={item.id}
              className="flex h-44 items-center justify-center rounded-lg border-2 border-dashed border-jmuDarkGold bg-jmuLightGold/25 px-4 text-center sm:h-36"
            >
              <span className="font-semibold text-jmuDarkGold">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
