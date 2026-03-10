import { supabase } from "../lib/supabaseClient";

const SPONSORS_FALLBACK = [];

function withPublicLogoUrl(row) {
  if (!row.logo_object_path) {
    return {
      ...row,
      logo_url: row.logo_url ?? "",
    };
  }

  const { data } = supabase.storage.from("media").getPublicUrl(row.logo_object_path);

  return {
    ...row,
    logo_url: data.publicUrl,
  };
}

export async function getSponsors() {
  const { data, error } = await supabase
    .from("sponsors")
    .select("id, name, website_url, logo_url, logo_object_path, alt_text")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Failed to load sponsors", error);
    return SPONSORS_FALLBACK;
  }

  return (data ?? []).map(withPublicLogoUrl);
}
