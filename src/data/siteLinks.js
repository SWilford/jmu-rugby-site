import { supabase } from "../lib/supabaseClient";

export const MERCH_URL_FALLBACK =
  "https://www.quarterathleticrugby.com/collections/jmu-mens-rugby-club";

export function normalizeExternalUrl(value, fallback = MERCH_URL_FALLBACK) {
  const trimmedValue = String(value || "").trim();
  if (!trimmedValue) return fallback;

  const withProtocol = /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;

  try {
    const parsedUrl = new URL(withProtocol);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) return fallback;
    return parsedUrl.toString();
  } catch {
    return fallback;
  }
}

export async function getMerchUrl() {
  const { data, error } = await supabase
    .from("donate_content_settings")
    .select("value")
    .eq("key", "merch_url")
    .maybeSingle();

  if (error) {
    console.error("Failed to load the Merch link", error);
    return MERCH_URL_FALLBACK;
  }

  return normalizeExternalUrl(data?.value);
}
