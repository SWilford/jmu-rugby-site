export default function JoinMediaPlaceholders({
  videoPlaceholderLabel,
  galleryPlaceholders,
  galleryImages = [],
  isGalleryLoading = false,
  galleryError = "",
}) {
  return (
    <section className="surface-card mt-8 p-6 sm:p-8">
      <h2 className="mb-4 text-2xl font-bold">See the Team in Action</h2>
      <p className="mb-6 text-jmuSlate">Get a feel for our training, match intensity, and team culture.</p>

      <div className="mb-6 rounded-xl border-2 border-dashed border-jmuDarkGold bg-jmuLightGold/25 p-8 text-center">
        <p className="text-lg font-semibold">Highlight Video</p>
        <p className="mt-2 text-jmuDarkGold">{videoPlaceholderLabel}</p>
      </div>

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
              className="flex h-36 items-center justify-center rounded-lg border-2 border-dashed border-jmuDarkGold bg-jmuLightGold/35 px-4 text-center"
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
              className="h-36 w-full rounded-lg border border-jmuDarkGold object-cover shadow-sm"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {galleryPlaceholders.map((item) => (
            <div
              key={item.id}
              className="flex h-36 items-center justify-center rounded-lg border-2 border-dashed border-jmuDarkGold bg-jmuLightGold/25 px-4 text-center"
            >
              <span className="font-semibold text-jmuDarkGold">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
