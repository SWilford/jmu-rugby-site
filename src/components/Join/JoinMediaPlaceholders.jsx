export default function JoinMediaPlaceholders({
  videoPlaceholderLabel,
  galleryPlaceholders,
  galleryImages = [],
}) {
  return (
    <section className="w-full max-w-6xl bg-jmuOffWhite text-jmuPurple border border-jmuDarkGold rounded-md p-8 mt-8">
      <h2 className="text-2xl font-bold mb-4">See the Team in Action</h2>
      <p className="text-jmuPurple/80 mb-6">
        Get a feel for our training, match intensity, and team culture.
      </p>

      <div className="border-2 border-dashed border-jmuDarkGold rounded-md bg-jmuLightGold/20 p-8 mb-6 text-center">
        <p className="font-semibold text-lg">Highlight Video</p>
        <p className="text-jmuDarkGold mt-2">{videoPlaceholderLabel}</p>
      </div>

      {galleryImages.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {galleryImages.map((item) => (
            <img
              key={item.id}
              src={item.src}
              alt={item.alt}
              className="h-36 w-full rounded-md border border-jmuDarkGold object-cover"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {galleryPlaceholders.map((item) => (
            <div
              key={item.id}
              className="h-36 rounded-md border-2 border-dashed border-jmuDarkGold bg-jmuLightGold/20 flex items-center justify-center text-center px-4"
            >
              <span className="text-jmuDarkGold font-semibold">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
