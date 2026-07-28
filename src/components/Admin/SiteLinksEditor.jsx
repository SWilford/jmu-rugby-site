import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { MERCH_URL_FALLBACK, normalizeExternalUrl } from "../../data/siteLinks";

const toUserFriendlyError = (error, fallbackMessage) => {
  const message = String(error?.message || fallbackMessage);

  if (/relation .*donate_content_settings|relation .*admins/i.test(message)) {
    return `${fallbackMessage} Site settings were not found. Run docs/supabase_donate_content.sql, then reload this page.`;
  }

  if (/row-level security|violates row-level security|permission denied/i.test(message)) {
    return `${fallbackMessage} Supabase blocked this write. Confirm this user is in public.admins.`;
  }

  return message;
};

export default function SiteLinksEditor() {
  const [merchUrl, setMerchUrl] = useState(MERCH_URL_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadMerchUrl = async () => {
      const { data, error: loadError } = await supabase
        .from("donate_content_settings")
        .select("value")
        .eq("key", "merch_url")
        .maybeSingle();

      if (!isMounted) return;

      if (loadError) {
        setError(toUserFriendlyError(loadError, "Unable to load the Merch link."));
      } else {
        setMerchUrl(normalizeExternalUrl(data?.value));
      }

      setLoading(false);
    };

    loadMerchUrl();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");

    const normalizedUrl = normalizeExternalUrl(merchUrl, "");
    if (!normalizedUrl) {
      setBusy(false);
      setError("Enter a valid web address for the Merch link.");
      return;
    }

    const { error: saveError } = await supabase.from("donate_content_settings").upsert(
      {
        key: "merch_url",
        value: normalizedUrl,
        description: "External Merch link displayed in the site header.",
      },
      { onConflict: "key" }
    );

    if (saveError) {
      setError(toUserFriendlyError(saveError, "Unable to save the Merch link."));
    } else {
      setMerchUrl(normalizedUrl);
      setStatus("Merch link saved. Refresh the public site to see the change.");
    }

    setBusy(false);
  };

  return (
    <>
      <h3 className="text-xl font-semibold text-jmuGold">Site Links</h3>
      <p className="mt-1 text-sm text-jmuLightGold/90">
        Update external links shown in the public site header.
      </p>

      {error && (
        <div className="mt-4 rounded border border-red-300 bg-red-100/10 px-4 py-3 text-red-200">
          {error}
        </div>
      )}

      {status && (
        <div className="mt-4 rounded border border-green-300 bg-green-100/10 px-4 py-3 text-green-100">
          {status}
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm">Loading site links...</p>
      ) : (
        <form
          className="mt-4 grid gap-3 rounded border border-jmuDarkGold/70 bg-jmuPurple/40 p-4"
          onSubmit={handleSave}
        >
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wide">Merch URL</span>
            <input
              type="url"
              required
              value={merchUrl}
              onChange={(event) => setMerchUrl(event.target.value)}
              placeholder={MERCH_URL_FALLBACK}
              className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
            />
            <span className="text-xs text-jmuLightGold/80">
              Opens in a new tab from the Merch item in the header.
            </span>
          </label>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-jmuGold px-4 py-2 text-sm font-semibold text-jmuPurple transition hover:bg-jmuLightGold disabled:cursor-not-allowed disabled:opacity-70"
            >
              {busy ? "Saving..." : "Save Merch link"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
