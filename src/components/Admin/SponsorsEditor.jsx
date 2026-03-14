import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { extractStorageObjectPath, sanitizeFileName } from "../../lib/mediaUtils";

const MEDIA_BUCKET = "rugby-media";
const SPONSOR_ROOT = "sponsors";

const EMPTY_FORM = {
  name: "",
  website_url: "",
  logo_url: "",
  alt_text: "",
  display_order: 0,
  is_active: true,
};

const normalizeText = (value) => String(value || "").trim();

const normalizeWebsiteUrl = (value) => {
  const trimmed = normalizeText(value);
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const toUserFriendlySponsorsError = (error, fallbackMessage) => {
  const rawMessage = error?.message || fallbackMessage;
  const isRlsError = /row-level security|violates row-level security|permission denied/i.test(
    String(rawMessage)
  );

  if (!isRlsError) return rawMessage;
  return `${fallbackMessage} Supabase blocked this write with RLS. Run docs/supabase_sponsors_admin_rls.sql and confirm this user is in public.admins.`;
};

export default function SponsorsEditor() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [formState, setFormState] = useState(EMPTY_FORM);

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [removeLogo, setRemoveLogo] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const [draggingRowId, setDraggingRowId] = useState("");
  const [dragOverRowId, setDragOverRowId] = useState("");

  const fileInputRef = useRef(null);

  const sortedRows = useMemo(
    () =>
      rows
        .slice()
        .sort((a, b) => {
          const orderCompare = Number(a.display_order || 0) - Number(b.display_order || 0);
          if (orderCompare !== 0) return orderCompare;
          return normalizeText(a.name).localeCompare(normalizeText(b.name), undefined, {
            sensitivity: "base",
          });
        }),
    [rows]
  );

  const loadRows = async () => {
    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("sponsors")
      .select("id, name, website_url, logo_url, alt_text, display_order, is_active")
      .order("display_order", { ascending: true })
      .order("updated_at", { ascending: false });

    if (loadError) {
      setError(loadError.message || "Unable to load sponsors.");
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
    if (!logoFile) {
      setLogoPreviewUrl("");
      return undefined;
    }

    const nextUrl = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [logoFile]);

  const resetForm = (options = {}) => {
    const { clearFeedback = true } = options;
    setEditingId(null);
    setFormState(EMPTY_FORM);
    setLogoFile(null);
    setRemoveLogo(false);
    setIsDraggingFile(false);
    if (clearFeedback) {
      setError("");
      setStatus("");
    }
  };

  const startEditing = (row) => {
    setEditingId(row.id);
    setError("");
    setStatus("");
    setLogoFile(null);
    setRemoveLogo(false);
    setFormState({
      name: normalizeText(row.name),
      website_url: normalizeText(row.website_url),
      logo_url: normalizeText(row.logo_url),
      alt_text: normalizeText(row.alt_text),
      display_order: Number(row.display_order || 0),
      is_active: Boolean(row.is_active),
    });
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const selectLogoFile = (incomingFileList) => {
    const files = Array.from(incomingFileList || []);
    if (files.length === 0) {
      setLogoFile(null);
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const skippedCount = files.length - imageFiles.length;

    if (!imageFiles.length) {
      setError("Only image files are supported for sponsor logos.");
      return;
    }

    setLogoFile(imageFiles[0]);
    setRemoveLogo(false);

    if (skippedCount > 0) {
      setError(`Ignored ${skippedCount} non-image file(s).`);
    } else {
      setError("");
    }

    if (imageFiles.length > 1) {
      setStatus("Selected the first image file.");
    } else {
      setStatus("");
    }
  };

  const uploadLogo = async (file, rowId, sponsorName) => {
    const safeName = sanitizeFileName(file.name || `${sponsorName || "sponsor"}-logo.png`);
    const objectPath = `${SPONSOR_ROOT}/${rowId}-${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(objectPath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(objectPath);
    return {
      objectPath,
      publicUrl: data.publicUrl,
    };
  };

  const removeLogoFromStorage = async (logoUrl, options = {}) => {
    const { required = false, context = "logo" } = options;
    const rawUrl = normalizeText(logoUrl);
    if (!rawUrl) return "";

    const objectPath = extractStorageObjectPath(rawUrl, MEDIA_BUCKET);
    if (!objectPath) {
      if (required) {
        throw new Error(
          `Could not determine ${context} storage path, so this action was canceled to avoid leaving an orphaned file.`
        );
      }
      return `Saved changes but could not determine the previous ${context} path for cleanup.`;
    }

    if (!objectPath.startsWith(`${SPONSOR_ROOT}/`)) {
      if (required) {
        throw new Error(
          `${context.charAt(0).toUpperCase()}${context.slice(
            1
          )} path does not point to ${SPONSOR_ROOT}/, so this action was canceled for safety.`
        );
      }
      return `Saved changes but skipped cleanup for a previous ${context} outside ${SPONSOR_ROOT}/.`;
    }

    const { error: removeError } = await supabase.storage.from(MEDIA_BUCKET).remove([objectPath]);
    if (removeError) {
      if (required) throw removeError;
      return `Saved changes but failed to remove the previous ${context} from storage.`;
    }

    return "";
  };

  const persistDisplayOrder = async (orderedRows) => {
    setBusy(true);
    setError("");
    setStatus("");

    try {
      const updates = orderedRows
        .map((row, index) => ({
          id: row.id,
          display_order: index + 1,
          hasChanged: Number(row.display_order || 0) !== index + 1,
        }))
        .filter((row) => row.hasChanged);

      if (!updates.length) {
        setStatus("Sponsor order already matches the dropped position.");
        return;
      }

      const writeResults = await Promise.all(
        updates.map((row) =>
          supabase.from("sponsors").update({ display_order: row.display_order }).eq("id", row.id)
        )
      );

      const failedWrite = writeResults.find((result) => result.error);
      if (failedWrite?.error) throw failedWrite.error;

      setStatus("Sponsor order updated.");
      await loadRows();
    } catch (orderError) {
      setError(toUserFriendlySponsorsError(orderError, "Unable to reorder sponsors."));
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");

    const payload = {
      name: normalizeText(formState.name),
      website_url: normalizeWebsiteUrl(formState.website_url) || null,
      alt_text: normalizeText(formState.alt_text) || null,
      display_order: Number(formState.display_order || 0),
      is_active: Boolean(formState.is_active),
    };

    if (!payload.name) {
      setBusy(false);
      setError("Sponsor name is required.");
      return;
    }

    const existingRow = rows.find((row) => row.id === editingId) || null;
    const previousLogoUrl = normalizeText(existingRow?.logo_url);
    const rowId = editingId || crypto.randomUUID();
    let nextLogoUrl = removeLogo ? "" : normalizeText(formState.logo_url);
    let uploadedObjectPath = "";
    let cleanupNotice = "";

    try {
      if (logoFile) {
        const uploadResult = await uploadLogo(logoFile, rowId, payload.name);
        uploadedObjectPath = uploadResult.objectPath;
        nextLogoUrl = uploadResult.publicUrl;
      }

      const writePayload = {
        ...payload,
        logo_url: nextLogoUrl || null,
      };

      let writeError;
      if (editingId) {
        ({ error: writeError } = await supabase.from("sponsors").update(writePayload).eq("id", editingId));
      } else {
        ({ error: writeError } = await supabase.from("sponsors").insert({ id: rowId, ...writePayload }));
      }

      if (writeError) throw writeError;

      const shouldRemoveOldLogo =
        Boolean(previousLogoUrl) &&
        previousLogoUrl !== nextLogoUrl &&
        (Boolean(logoFile) || removeLogo);

      if (shouldRemoveOldLogo) {
        cleanupNotice = await removeLogoFromStorage(previousLogoUrl, {
          required: false,
          context: "sponsor logo",
        });
      }

      setStatus(editingId ? "Sponsor updated." : "Sponsor added.");
      if (cleanupNotice) {
        setStatus((current) => `${current} ${cleanupNotice}`.trim());
      }

      resetForm({ clearFeedback: false });
      await loadRows();
    } catch (saveError) {
      if (uploadedObjectPath) {
        await supabase.storage.from(MEDIA_BUCKET).remove([uploadedObjectPath]);
      }
      setError(toUserFriendlySponsorsError(saveError, "Unable to save this sponsor."));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete sponsor "${row.name}"? This also deletes the logo file.`)) return;

    setBusy(true);
    setError("");
    setStatus("");

    try {
      await removeLogoFromStorage(row.logo_url, {
        required: true,
        context: "sponsor logo",
      });

      const { error: deleteError } = await supabase.from("sponsors").delete().eq("id", row.id);
      if (deleteError) throw deleteError;

      if (editingId === row.id) {
        resetForm({ clearFeedback: false });
      }

      setStatus("Sponsor removed.");
      await loadRows();
    } catch (deleteError) {
      setError(toUserFriendlySponsorsError(deleteError, "Unable to remove this sponsor."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h3 className="text-xl font-semibold text-jmuGold">Sponsors Editor</h3>
      <p className="mt-1 text-sm text-jmuLightGold/90">
        Add, edit, remove, and reorder footer sponsors. Drag and drop sponsor logos into
        rugby-media/sponsors.
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
        <p className="mt-4 text-sm">Loading sponsors editor...</p>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr,1fr]">
          <div className="rounded border border-jmuDarkGold/70 bg-jmuPurple/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-semibold text-jmuGold">Current Sponsors</h4>
              <button
                type="button"
                disabled={busy}
                onClick={resetForm}
                className="rounded border border-jmuLightGold px-3 py-1 text-xs hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
              >
                New sponsor
              </button>
            </div>

            <p className="mt-2 text-xs text-jmuLightGold/80">
              Drag cards to reorder by display order.
            </p>

            {sortedRows.length === 0 ? (
              <p className="mt-3 text-sm">No sponsors yet.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {sortedRows.map((row) => {
                  const isDraggedOver = dragOverRowId === row.id;
                  const isEditing = editingId === row.id;
                  return (
                    <li
                      key={row.id}
                      draggable={!busy}
                      onDragStart={() => {
                        if (busy) return;
                        setDraggingRowId(row.id);
                        setDragOverRowId(row.id);
                      }}
                      onDragOver={(event) => {
                        if (busy) return;
                        event.preventDefault();
                        if (dragOverRowId !== row.id) {
                          setDragOverRowId(row.id);
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (busy || !draggingRowId || draggingRowId === row.id) {
                          setDraggingRowId("");
                          setDragOverRowId("");
                          return;
                        }

                        const reordered = sortedRows.slice();
                        const fromIndex = reordered.findIndex((item) => item.id === draggingRowId);
                        const toIndex = reordered.findIndex((item) => item.id === row.id);
                        if (fromIndex < 0 || toIndex < 0) {
                          setDraggingRowId("");
                          setDragOverRowId("");
                          return;
                        }

                        const [movedItem] = reordered.splice(fromIndex, 1);
                        reordered.splice(toIndex, 0, movedItem);
                        setDraggingRowId("");
                        setDragOverRowId("");
                        persistDisplayOrder(reordered);
                      }}
                      onDragEnd={() => {
                        setDraggingRowId("");
                        setDragOverRowId("");
                      }}
                      className={`cursor-move rounded border px-3 py-2 ${
                        isDraggedOver
                          ? "border-jmuGold bg-jmuGold/15"
                          : isEditing
                            ? "border-jmuGold bg-jmuGold/15"
                            : "border-jmuDarkGold/70 bg-jmuPurple/30"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {row.logo_url ? (
                            <img
                              src={row.logo_url}
                              alt={row.alt_text || `${row.name} logo`}
                              className="h-12 w-12 rounded border border-jmuDarkGold/80 bg-jmuPurple/20 object-contain p-1"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded border border-jmuDarkGold/80 bg-jmuPurple/20 text-[10px] text-jmuLightGold/70">
                              No logo
                            </div>
                          )}
                          <div>
                            <p className="font-semibold">{normalizeText(row.name) || "Untitled sponsor"}</p>
                            <p className="text-xs text-jmuLightGold/85">
                              {normalizeText(row.website_url) || "No website URL"}
                            </p>
                            <p className="text-xs text-jmuLightGold/75">
                              Order: {Number(row.display_order || 0)} -{" "}
                              {Boolean(row.is_active) ? "Active" : "Hidden"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => startEditing(row)}
                            className="rounded border border-jmuLightGold px-2 py-1 text-xs hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleDelete(row)}
                            className="rounded border border-red-300 px-2 py-1 text-xs text-red-100 hover:bg-red-100/20 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded border border-jmuDarkGold/70 bg-jmuPurple/40 p-4">
            <h4 className="font-semibold text-jmuGold">
              {editingId ? "Edit Sponsor" : "Add Sponsor"}
            </h4>
            <p className="mt-1 text-xs text-jmuLightGold/80">
              Include a website URL for clickable sponsor logos on the public footer.
            </p>

            <form className="mt-4 grid gap-3" onSubmit={handleSave}>
              <label className="grid gap-1">
                <span className="text-xs uppercase tracking-wide">Sponsor Name</span>
                <input
                  required
                  name="name"
                  value={formState.name}
                  onChange={handleFormChange}
                  placeholder="Local Business Name"
                  className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs uppercase tracking-wide">Website URL (optional)</span>
                <input
                  name="website_url"
                  value={formState.website_url}
                  onChange={handleFormChange}
                  placeholder="https://example.com"
                  className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs uppercase tracking-wide">Logo Alt Text (optional)</span>
                <input
                  name="alt_text"
                  value={formState.alt_text}
                  onChange={handleFormChange}
                  placeholder="Example company logo"
                  className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs uppercase tracking-wide">Display Order</span>
                <input
                  type="number"
                  step="1"
                  name="display_order"
                  value={formState.display_order}
                  onChange={handleFormChange}
                  className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                />
              </label>

              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formState.is_active}
                  onChange={handleFormChange}
                />
                Show this sponsor publicly
              </label>

              <div className="rounded border border-jmuDarkGold/70 bg-jmuPurple/20 p-3">
                <p className="text-xs uppercase tracking-wide text-jmuLightGold/90">Sponsor Logo</p>
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsDraggingFile(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDraggingFile(false);
                    selectLogoFile(event.dataTransfer.files);
                  }}
                  className={`mt-2 rounded border-2 border-dashed px-4 py-5 text-center transition ${
                    isDraggingFile
                      ? "border-jmuGold bg-jmuGold/10"
                      : "border-jmuDarkGold/80 bg-jmuPurple/30"
                  }`}
                >
                  <p className="text-sm">Drag and drop a logo image here</p>
                  <p className="mt-1 text-xs text-jmuLightGold/80">or</p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 rounded border border-jmuLightGold px-3 py-1 text-sm hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Choose file
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      selectLogoFile(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </div>

                {logoFile && (
                  <div className="mt-3 rounded border border-jmuDarkGold/80 bg-jmuPurple/30 p-2 text-xs">
                    <p className="font-semibold">Selected: {logoFile.name}</p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setLogoFile(null)}
                      className="mt-2 rounded border border-jmuLightGold px-2 py-1 hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Clear selected logo
                    </button>
                  </div>
                )}

                {(logoPreviewUrl || (!removeLogo && formState.logo_url)) && (
                  <div className="mt-3">
                    <p className="text-xs text-jmuLightGold/90">
                      {logoPreviewUrl ? "New preview" : "Current logo"}
                    </p>
                    <img
                      src={logoPreviewUrl || formState.logo_url}
                      alt={formState.alt_text || `${formState.name || "Sponsor"} logo preview`}
                      className="mt-1 h-20 w-auto max-w-full rounded border border-jmuDarkGold bg-jmuPurple/20 object-contain p-1"
                    />
                  </div>
                )}

                {Boolean(formState.logo_url) && (
                  <label className="mt-3 inline-flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={removeLogo}
                      disabled={busy || Boolean(logoFile)}
                      onChange={(event) => setRemoveLogo(event.target.checked)}
                    />
                    Remove current logo on save
                  </label>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {editingId && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={resetForm}
                    className="rounded border border-jmuLightGold px-4 py-2 text-sm hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Cancel edit
                  </button>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded bg-jmuGold px-4 py-2 text-sm font-semibold text-jmuPurple transition hover:bg-jmuLightGold disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {busy ? "Saving..." : editingId ? "Save sponsor" : "Add sponsor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
