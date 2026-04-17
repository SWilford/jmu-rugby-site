import { supabase } from "../lib/supabaseClient";

export const DONATE_INFO_FALLBACK = {
  venmoUrl: "https://venmo.com/u/David-Neal-84",
  recipientName: "David Neal",
};

const SETTINGS_TO_DONATE_INFO = {
  venmo_url: "venmoUrl",
  venmo_recipient_name: "recipientName",
};

const normalizeText = (value) => String(value || "").trim();

export function normalizeVenmoUrl(value) {
  const trimmedValue = normalizeText(value);

  if (!trimmedValue) {
    return DONATE_INFO_FALLBACK.venmoUrl;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue.replace(/^http:\/\//i, "https://");
  }

  if (/^venmo\.com\//i.test(trimmedValue)) {
    return `https://${trimmedValue}`;
  }

  const normalizedHandle = trimmedValue.replace(/^@/, "").replace(/^u\//i, "");
  return `https://venmo.com/u/${normalizedHandle}`;
}

function mapSettingsToDonateInfo(settingsRows) {
  return settingsRows.reduce((donateInfo, row) => {
    const targetKey = SETTINGS_TO_DONATE_INFO[row.key];

    if (targetKey === "venmoUrl") {
      donateInfo.venmoUrl = normalizeVenmoUrl(row.value);
    }

    if (targetKey === "recipientName") {
      donateInfo.recipientName = normalizeText(row.value) || DONATE_INFO_FALLBACK.recipientName;
    }

    return donateInfo;
  }, structuredClone(DONATE_INFO_FALLBACK));
}

export async function getDonateInfo(options = {}) {
  const { throwOnError = false } = options;

  const response = await supabase.from("donate_content_settings").select("key, value");

  if (response.error) {
    console.error("Failed to load donate content", {
      donateError: response.error,
    });

    if (throwOnError) {
      throw new Error(response.error.message || "Failed to load donate content.");
    }

    return DONATE_INFO_FALLBACK;
  }

  return mapSettingsToDonateInfo(response.data ?? []);
}

export default DONATE_INFO_FALLBACK;
