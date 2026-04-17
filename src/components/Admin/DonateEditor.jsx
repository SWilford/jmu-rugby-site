import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { DONATE_INFO_FALLBACK, normalizeVenmoUrl } from "../../data/donateInfo";

const EDITABLE_SETTING_KEYS = ["venmo_url", "venmo_recipient_name"];

const SETTING_LABELS = {
  venmo_url: "Venmo URL",
  venmo_recipient_name: "Recipient Name",
};

const SETTING_DESCRIPTIONS = {
  venmo_url:
    "This URL is used for both the Donate button and the QR code. You can paste a full Venmo URL or just the handle.",
  venmo_recipient_name: "Used for the Donate page QR alt text and recipient copy.",
};

const SETTING_DEFAULT_VALUES = {
  venmo_url: DONATE_INFO_FALLBACK.venmoUrl,
  venmo_recipient_name: DONATE_INFO_FALLBACK.recipientName,
};

const normalizeText = (value) => String(value || "").trim();

const toUserFriendlyDonateError = (error, fallbackMessage) => {
  const rawMessage = error?.message || fallbackMessage;
  const message = String(rawMessage);
  const isRlsError = /row-level security|violates row-level security|permission denied/i.test(message);
  const isMissingTableError = /relation .*donate_content_settings|relation .*admins/i.test(message);

  if (isMissingTableError) {
    return `${fallbackMessage} Donate settings table was not found. Run docs/supabase_donate_content.sql, then reload this page.`;
  }

  if (!isRlsError) return message;
  return `${fallbackMessage} Supabase blocked this write with RLS. Run docs/supabase_donate_content.sql and confirm this user is in public.admins.`;
};

export default function DonateEditor() {
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const sortedSettings = useMemo(() => {
    const rowByKey = new Map(rows.map((row) => [row.key, row]));

    return EDITABLE_SETTING_KEYS.map((key) => {
      const existingRow = rowByKey.get(key);

      if (existingRow) {
        return existingRow;
      }

      return {
        id: null,
        key,
        value: SETTING_DEFAULT_VALUES[key] ?? "",
        description: SETTING_DESCRIPTIONS[key] || "",
      };
    });
  }, [rows]);

  const loadRows = async () => {
    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("donate_content_settings")
      .select("id, key, value, description");

    if (loadError) {
      setError(toUserFriendlyDonateError(loadError, "Unable to load donate settings."));
      setLoading(false);
      return;
    }

    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadRows();
  }, []);

  useEffect(() => {
    const nextDrafts = sortedSettings.reduce((allDrafts, row) => {
      allDrafts[row.key] = normalizeText(row.value) || SETTING_DEFAULT_VALUES[row.key] || "";
      return allDrafts;
    }, {});

    setDrafts(nextDrafts);
  }, [sortedSettings]);

  const handleSave = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");

    const payload = sortedSettings.map((row) => {
      const value =
        row.key === "venmo_url"
          ? normalizeVenmoUrl(drafts[row.key])
          : normalizeText(drafts[row.key]) || SETTING_DEFAULT_VALUES[row.key];

      return {
        key: row.key,
        value,
        description: row.description || SETTING_DESCRIPTIONS[row.key] || null,
      };
    });

    const venmoUrl = payload.find((row) => row.key === "venmo_url")?.value;
    const recipientName = payload.find((row) => row.key === "venmo_recipient_name")?.value;

    if (!venmoUrl || !recipientName) {
      setBusy(false);
      setError("Both the Venmo URL and recipient name are required.");
      return;
    }

    try {
      const { error: saveError } = await supabase
        .from("donate_content_settings")
        .upsert(payload, { onConflict: "key" });

      if (saveError) {
        throw saveError;
      }

      setStatus("Donate settings saved.");
      await loadRows();
    } catch (saveError) {
      setError(toUserFriendlyDonateError(saveError, "Unable to save donate settings."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h3 className="text-xl font-semibold text-jmuGold">Donate Editor</h3>
      <p className="mt-1 text-sm text-jmuLightGold/90">
        Update the Venmo recipient used on the public Donate page.
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
        <p className="mt-4 text-sm">Loading donate editor...</p>
      ) : (
        <form className="mt-4 grid gap-3 rounded border border-jmuDarkGold/70 bg-jmuPurple/40 p-4" onSubmit={handleSave}>
          {sortedSettings.map((row) => {
            const key = row.key;
            const label = SETTING_LABELS[key] || key;
            const helperText = row.description || SETTING_DESCRIPTIONS[key] || "";

            return (
              <label key={key} className="grid gap-1">
                <span className="text-xs uppercase tracking-wide">{label}</span>
                <input
                  value={drafts[key] ?? ""}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [key]: event.target.value }))}
                  placeholder={SETTING_DEFAULT_VALUES[key]}
                  className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                />
                {helperText && <span className="text-xs text-jmuLightGold/80">{helperText}</span>}
              </label>
            );
          })}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-jmuGold px-4 py-2 text-sm font-semibold text-jmuPurple transition hover:bg-jmuLightGold disabled:cursor-not-allowed disabled:opacity-70"
            >
              {busy ? "Saving..." : "Save donate settings"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
