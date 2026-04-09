
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { extractStorageObjectPath, sanitizeFileName } from "../../lib/mediaUtils";
import { buildRosterImportDiff, buildRosterImportPreview } from "../../lib/rosterCsv";
import { buildStoragePublicUrl, deleteR2Objects, uploadFileToR2 } from "../../lib/storageUtils";

const MEDIA_BUCKET = "rugby-media";
const HEADSHOT_ROOT = "headshots";

const EMPTY_PLAYER_FORM = {
  name: "",
  position: "",
  year: "",
  major: "",
  hometown: "",
  height: "",
  weight: "",
  bio: "",
  headshot_url: "",
};

const EMPTY_COACH_FORM = {
  name: "",
  position: "",
  bio: "",
  headshot_url: "",
};

const getNextTableId = async (tableName) => {
  const { data, error } = await supabase
    .from(tableName)
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.id ?? 0) + 1;
};

const toUserFriendlyRosterError = (error, fallbackMessage) => {
  const rawMessage = error?.message || fallbackMessage;
  const isRlsError = /row-level security|violates row-level security|permission denied/i.test(
    String(rawMessage)
  );

  if (!isRlsError) return rawMessage;
  return `${fallbackMessage} Supabase blocked this write with RLS. Run docs/supabase_roster_admin_rls.sql and confirm this user is in public.admins.`;
};

const normalizeText = (value) => String(value || "").trim();
const toNullableText = (value) => {
  const normalized = normalizeText(value);
  return normalized || null;
};
const toNullableNumber = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildPlayerWritePayload = (player) => ({
  name: normalizeText(player.name),
  position: normalizeText(player.position),
  year: toNullableText(player.year),
  major: toNullableText(player.major),
  hometown: toNullableText(player.hometown),
  height: toNullableText(player.height),
  weight: toNullableNumber(player.weight),
  bio: toNullableText(player.bio),
  headshot_url: toNullableText(player.headshot_url),
});

function HeadshotDropzone({
  isDragging,
  setIsDragging,
  onSelectFile,
  inputRef,
  busy,
  selectedFile,
  previewUrl,
  existingUrl,
  removeOnSave,
  onToggleRemove,
  label,
}) {
  return (
    <div className="rounded border border-jmuDarkGold/70 bg-jmuPurple/20 p-3">
      <p className="text-xs uppercase tracking-wide text-jmuLightGold/90">Headshot</p>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          onSelectFile(event.dataTransfer.files);
        }}
        className={`mt-2 rounded border-2 border-dashed px-4 py-5 text-center transition ${
          isDragging ? "border-jmuGold bg-jmuGold/10" : "border-jmuDarkGold/80 bg-jmuPurple/30"
        }`}
      >
        <p className="text-sm">Drag and drop an image here</p>
        <p className="mt-1 text-xs text-jmuLightGold/80">or</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="mt-2 rounded border border-jmuLightGold px-3 py-1 text-sm hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
        >
          Choose file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            onSelectFile(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {selectedFile && (
        <div className="mt-3 rounded border border-jmuDarkGold/80 bg-jmuPurple/30 p-2 text-xs">
          <p className="font-semibold">Selected: {selectedFile.name}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSelectFile([])}
            className="mt-2 rounded border border-jmuLightGold px-2 py-1 hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
          >
            Clear selected image
          </button>
        </div>
      )}

      {(previewUrl || existingUrl) && (
        <div className="mt-3">
          <p className="text-xs text-jmuLightGold/90">
            {previewUrl ? "New preview" : `Current ${label} headshot`}
          </p>
          <img
            src={previewUrl || existingUrl}
            alt={`${label} headshot preview`}
            className="mt-1 h-36 w-28 rounded border border-jmuDarkGold object-cover"
          />
        </div>
      )}

      {Boolean(existingUrl) && (
        <label className="mt-3 inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={removeOnSave}
            disabled={busy || Boolean(selectedFile)}
            onChange={(event) => onToggleRemove(event.target.checked)}
          />
          Remove current headshot on save
        </label>
      )}
    </div>
  );
}

export default function RosterEditor() {
  const [activeSection, setActiveSection] = useState("players");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const [players, setPlayers] = useState([]);
  const [coaches, setCoaches] = useState([]);

  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editingCoachId, setEditingCoachId] = useState(null);

  const [playerForm, setPlayerForm] = useState(EMPTY_PLAYER_FORM);
  const [coachForm, setCoachForm] = useState(EMPTY_COACH_FORM);

  const [playerHeadshotFile, setPlayerHeadshotFile] = useState(null);
  const [coachHeadshotFile, setCoachHeadshotFile] = useState(null);
  const [playerHeadshotPreviewUrl, setPlayerHeadshotPreviewUrl] = useState("");
  const [coachHeadshotPreviewUrl, setCoachHeadshotPreviewUrl] = useState("");
  const [removePlayerHeadshot, setRemovePlayerHeadshot] = useState(false);
  const [removeCoachHeadshot, setRemoveCoachHeadshot] = useState(false);
  const [playerDragging, setPlayerDragging] = useState(false);
  const [coachDragging, setCoachDragging] = useState(false);
  const [csvImportPreview, setCsvImportPreview] = useState(null);
  const [csvImportFileName, setCsvImportFileName] = useState("");

  const playerFileInputRef = useRef(null);
  const coachFileInputRef = useRef(null);
  const csvFileInputRef = useRef(null);

  const sortedPlayers = useMemo(
    () =>
      players
        .slice()
        .sort((a, b) => normalizeText(a.name).localeCompare(normalizeText(b.name), undefined, { sensitivity: "base" })),
    [players]
  );

  const sortedCoaches = useMemo(() => {
    const rows = coaches.slice();
    rows.sort((a, b) => {
      const aHeadCoach = normalizeText(a.position).toLowerCase().includes("head coach");
      const bHeadCoach = normalizeText(b.position).toLowerCase().includes("head coach");
      if (aHeadCoach !== bHeadCoach) return aHeadCoach ? -1 : 1;
      return normalizeText(a.name).localeCompare(normalizeText(b.name), undefined, { sensitivity: "base" });
    });
    return rows;
  }, [coaches]);

  const resetPlayerForm = () => {
    setEditingPlayerId(null);
    setPlayerForm(EMPTY_PLAYER_FORM);
    setPlayerHeadshotFile(null);
    setRemovePlayerHeadshot(false);
    setPlayerDragging(false);
  };

  const resetCoachForm = () => {
    setEditingCoachId(null);
    setCoachForm(EMPTY_COACH_FORM);
    setCoachHeadshotFile(null);
    setRemoveCoachHeadshot(false);
    setCoachDragging(false);
  };

  const resetCsvImportState = () => {
    setCsvImportPreview(null);
    setCsvImportFileName("");
    if (csvFileInputRef.current) {
      csvFileInputRef.current.value = "";
    }
  };

  const loadRosterData = async () => {
    setLoading(true);
    setError("");

    try {
      const [{ data: rosterRows, error: rosterError }, { data: coachRows, error: coachError }] =
        await Promise.all([
          supabase.from("roster").select("*"),
          supabase.from("coaches").select("*"),
        ]);

      if (rosterError) throw rosterError;
      if (coachError) throw coachError;

      setPlayers(rosterRows || []);
      setCoaches(coachRows || []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load roster editor data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRosterData();
  }, []);

  useEffect(() => {
    if (!playerHeadshotFile) {
      setPlayerHeadshotPreviewUrl("");
      return undefined;
    }

    const nextUrl = URL.createObjectURL(playerHeadshotFile);
    setPlayerHeadshotPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [playerHeadshotFile]);

  useEffect(() => {
    if (!coachHeadshotFile) {
      setCoachHeadshotPreviewUrl("");
      return undefined;
    }

    const nextUrl = URL.createObjectURL(coachHeadshotFile);
    setCoachHeadshotPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [coachHeadshotFile]);

  const selectHeadshotFile = (incomingFileList, setFile, entityLabel) => {
    const files = Array.from(incomingFileList || []);
    if (files.length === 0) {
      setFile(null);
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const skippedCount = files.length - imageFiles.length;

    if (!imageFiles.length) {
      setError("Only image files are supported for headshots.");
      return;
    }

    setFile(imageFiles[0]);
    if (skippedCount > 0) {
      setError(`Ignored ${skippedCount} non-image file(s).`);
    } else {
      setError("");
    }

    if (imageFiles.length > 1) {
      setStatus(`Selected the first image for ${entityLabel}.`);
    } else {
      setStatus("");
    }
  };

  const uploadHeadshot = async (file, folderName, rowId, label) => {
    const safeLabel = sanitizeFileName(label || `${folderName}-${rowId}.jpg`);
    const objectPath = `${HEADSHOT_ROOT}/${folderName}/${rowId}-${Date.now()}-${safeLabel}`;
    const uploadResult = await uploadFileToR2(file, objectPath);
    return {
      objectPath: uploadResult.objectPath,
    };
  };

  const removeHeadshotFromStorage = async (headshotUrl, options = {}) => {
    const { required = false, context = "headshot" } = options;
    const rawUrl = normalizeText(headshotUrl);
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

    if (!objectPath.startsWith(`${HEADSHOT_ROOT}/`)) {
      if (required) {
        throw new Error(
          `${context.charAt(0).toUpperCase()}${context.slice(
            1
          )} path does not point to ${HEADSHOT_ROOT}/, so this action was canceled for safety.`
        );
      }
      return `Saved changes but skipped cleanup for a previous ${context} outside ${HEADSHOT_ROOT}/.`;
    }

    try {
      await deleteR2Objects([objectPath]);
    } catch (removeError) {
      if (required) throw removeError;
      return `Saved changes but failed to remove the previous ${context} from storage.`;
    }

    return "";
  };

  const startEditingPlayer = (player) => {
    setError("");
    setStatus("");
    setActiveSection("players");
    setEditingPlayerId(player.id);
    setPlayerHeadshotFile(null);
    setRemovePlayerHeadshot(false);
    setPlayerForm({
      name: normalizeText(player.name),
      position: normalizeText(player.position),
      year: normalizeText(player.year),
      major: normalizeText(player.major),
      hometown: normalizeText(player.hometown),
      height: normalizeText(player.height),
      weight: normalizeText(player.weight),
      bio: normalizeText(player.bio),
      headshot_url: normalizeText(player.headshot_url),
    });
  };

  const handlePreviewCsvImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setStatus("");

    try {
      const csvText = await file.text();
      const preview = buildRosterImportPreview(csvText, players);
      setCsvImportPreview(preview);
      setCsvImportFileName(file.name);

      if (preview.summary.parsed === 0) {
        setStatus("The CSV did not contain any player rows after formatting.");
      } else if (preview.invalidRows.length > 0) {
        setStatus(
          `Preview ready. Fix ${preview.invalidRows.length} row${
            preview.invalidRows.length === 1 ? "" : "s"
          } before replacing the roster.`
        );
      } else {
        setStatus(
          `Preview ready for ${preview.summary.valid} player${
            preview.summary.valid === 1 ? "" : "s"
          }. Confirm below to replace the roster.`
        );
      }
    } catch (previewError) {
      resetCsvImportState();
      setError(previewError.message || "Unable to read this CSV file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleReplaceRosterFromCsv = async () => {
    if (!csvImportPreview) {
      setError("Upload a CSV to preview the replacement before importing.");
      return;
    }

    if (csvImportPreview.invalidRows.length > 0) {
      setError("Fix the CSV issues shown in the preview before replacing the roster.");
      return;
    }

    if (csvImportPreview.validRows.length === 0) {
      setError("This CSV does not contain any valid player rows to import.");
      return;
    }

    if (!window.confirm("Replace the current player roster with this CSV preview? Existing matching headshots will be kept.")) {
      return;
    }

    setBusy(true);
    setError("");
    setStatus("");

    try {
      const diff = buildRosterImportDiff(players, csvImportPreview.validRows);

      for (const row of diff.matchedRows) {
        const writePayload = buildPlayerWritePayload(row.nextRow);
        const { error: updateError } = await supabase.from("roster").update(writePayload).eq("id", row.existingPlayer.id);
        if (updateError) throw updateError;
      }

      if (diff.newRows.length > 0) {
        const insertPayload = diff.newRows.map((row) => ({
          id: row.id,
          ...buildPlayerWritePayload(row),
        }));
        const { error: insertError } = await supabase.from("roster").insert(insertPayload);
        if (insertError) throw insertError;
      }

      if (diff.removedPlayers.length > 0) {
        const { error: deleteError } = await supabase
          .from("roster")
          .delete()
          .in(
            "id",
            diff.removedPlayers.map((player) => player.id)
          );
        if (deleteError) throw deleteError;
      }

      const cleanupNotices = [];
      for (const player of diff.removedPlayers) {
        const notice = await removeHeadshotFromStorage(player.headshot_url, {
          required: false,
          context: `player headshot for ${normalizeText(player.name) || `player #${player.id}`}`,
        });
        if (notice) cleanupNotices.push(notice);
      }

      if (editingPlayerId && diff.removedPlayers.some((player) => player.id === editingPlayerId)) {
        resetPlayerForm();
      }

      resetCsvImportState();
      await loadRosterData();

      let nextStatus = `Roster replaced. ${diff.summary.matched} matched, ${diff.summary.added} added, ${diff.summary.removed} removed.`;
      if (cleanupNotices.length > 0) {
        nextStatus = `${nextStatus} ${Array.from(new Set(cleanupNotices)).join(" ")}`.trim();
      }
      setStatus(nextStatus);
    } catch (importError) {
      setError(toUserFriendlyRosterError(importError, "Unable to replace the roster from this CSV."));
    } finally {
      setBusy(false);
    }
  };

  const startEditingCoach = (coach) => {
    setError("");
    setStatus("");
    setActiveSection("coaches");
    setEditingCoachId(coach.id);
    setCoachHeadshotFile(null);
    setRemoveCoachHeadshot(false);
    setCoachForm({
      name: normalizeText(coach.name),
      position: normalizeText(coach.position),
      bio: normalizeText(coach.bio),
      headshot_url: normalizeText(coach.headshot_url),
    });
  };

  const handleSavePlayer = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");

    const payload = {
      name: normalizeText(playerForm.name),
      position: normalizeText(playerForm.position),
      year: normalizeText(playerForm.year),
      major: normalizeText(playerForm.major),
      hometown: normalizeText(playerForm.hometown),
      height: normalizeText(playerForm.height),
      weight: normalizeText(playerForm.weight),
      bio: normalizeText(playerForm.bio),
    };

    if (!payload.name || !payload.position) {
      setError("Player name and position are required.");
      return;
    }

    setBusy(true);

    let rowId = editingPlayerId;
    let uploadedObjectPath = "";
    let cleanupNotice = "";
    const existingPlayer = players.find((row) => row.id === editingPlayerId) || null;
    const previousHeadshotPath = normalizeText(existingPlayer?.headshot_url);
    let nextHeadshotPath = removePlayerHeadshot ? "" : normalizeText(playerForm.headshot_url);

    try {
      if (!editingPlayerId) {
        rowId = await getNextTableId("roster");
      }

      if (playerHeadshotFile) {
        const uploadResult = await uploadHeadshot(playerHeadshotFile, "players", rowId, payload.name);
        uploadedObjectPath = uploadResult.objectPath;
        nextHeadshotPath = uploadResult.objectPath;
      }

      const writePayload = {
        ...buildPlayerWritePayload({
          ...payload,
          headshot_url: nextHeadshotPath,
        }),
      };

      let writeError;
      if (editingPlayerId) {
        ({ error: writeError } = await supabase.from("roster").update(writePayload).eq("id", editingPlayerId));
      } else {
        ({ error: writeError } = await supabase.from("roster").insert({ id: rowId, ...writePayload }));
      }

      if (writeError) throw writeError;

      const shouldRemoveOldHeadshot =
        Boolean(previousHeadshotPath) &&
        previousHeadshotPath !== nextHeadshotPath &&
        (Boolean(playerHeadshotFile) || removePlayerHeadshot);

      if (shouldRemoveOldHeadshot) {
        cleanupNotice = await removeHeadshotFromStorage(previousHeadshotPath, {
          required: false,
          context: "player headshot",
        });
      }

      setStatus(editingPlayerId ? "Player updated." : "Player added.");
      if (cleanupNotice) {
        setStatus((current) => `${current} ${cleanupNotice}`.trim());
      }
      resetPlayerForm();
      await loadRosterData();
    } catch (saveError) {
      if (uploadedObjectPath) {
        await deleteR2Objects([uploadedObjectPath]);
      }
      setError(toUserFriendlyRosterError(saveError, "Unable to save this player."));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveCoach = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");

    const payload = {
      name: normalizeText(coachForm.name),
      position: normalizeText(coachForm.position),
      bio: normalizeText(coachForm.bio),
    };

    if (!payload.name || !payload.position) {
      setError("Coach name and position are required.");
      return;
    }

    setBusy(true);

    let rowId = editingCoachId;
    let uploadedObjectPath = "";
    let cleanupNotice = "";
    const existingCoach = coaches.find((row) => row.id === editingCoachId) || null;
    const previousHeadshotPath = normalizeText(existingCoach?.headshot_url);
    let nextHeadshotPath = removeCoachHeadshot ? "" : normalizeText(coachForm.headshot_url);

    try {
      if (!editingCoachId) {
        rowId = await getNextTableId("coaches");
      }

      if (coachHeadshotFile) {
        const uploadResult = await uploadHeadshot(coachHeadshotFile, "coaches", rowId, payload.name);
        uploadedObjectPath = uploadResult.objectPath;
        nextHeadshotPath = uploadResult.objectPath;
      }

      const writePayload = {
        ...payload,
        headshot_url: nextHeadshotPath || null,
      };

      let writeError;
      if (editingCoachId) {
        ({ error: writeError } = await supabase.from("coaches").update(writePayload).eq("id", editingCoachId));
      } else {
        ({ error: writeError } = await supabase.from("coaches").insert({ id: rowId, ...writePayload }));
      }

      if (writeError) throw writeError;

      const shouldRemoveOldHeadshot =
        Boolean(previousHeadshotPath) &&
        previousHeadshotPath !== nextHeadshotPath &&
        (Boolean(coachHeadshotFile) || removeCoachHeadshot);

      if (shouldRemoveOldHeadshot) {
        cleanupNotice = await removeHeadshotFromStorage(previousHeadshotPath, {
          required: false,
          context: "coach headshot",
        });
      }

      setStatus(editingCoachId ? "Coach updated." : "Coach added.");
      if (cleanupNotice) {
        setStatus((current) => `${current} ${cleanupNotice}`.trim());
      }
      resetCoachForm();
      await loadRosterData();
    } catch (saveError) {
      if (uploadedObjectPath) {
        await deleteR2Objects([uploadedObjectPath]);
      }
      setError(toUserFriendlyRosterError(saveError, "Unable to save this coach."));
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePlayer = async (player) => {
    if (!window.confirm(`Delete player "${player.name}"? This also deletes the headshot file.`)) {
      return;
    }

    setBusy(true);
    setError("");
    setStatus("");

    try {
      await removeHeadshotFromStorage(player.headshot_url, {
        required: true,
        context: "player headshot",
      });

      const { error: deleteError } = await supabase.from("roster").delete().eq("id", player.id);
      if (deleteError) throw deleteError;

      if (editingPlayerId === player.id) {
        resetPlayerForm();
      }

      setStatus("Player removed.");
      await loadRosterData();
    } catch (deleteError) {
      setError(toUserFriendlyRosterError(deleteError, "Unable to remove this player."));
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCoach = async (coach) => {
    if (!window.confirm(`Delete coach "${coach.name}"? This also deletes the headshot file.`)) {
      return;
    }

    setBusy(true);
    setError("");
    setStatus("");

    try {
      await removeHeadshotFromStorage(coach.headshot_url, {
        required: true,
        context: "coach headshot",
      });

      const { error: deleteError } = await supabase.from("coaches").delete().eq("id", coach.id);
      if (deleteError) throw deleteError;

      if (editingCoachId === coach.id) {
        resetCoachForm();
      }

      setStatus("Coach removed.");
      await loadRosterData();
    } catch (deleteError) {
      setError(toUserFriendlyRosterError(deleteError, "Unable to remove this coach."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h3 className="text-xl font-semibold text-jmuGold">Roster Editor</h3>
      <p className="mt-1 text-sm text-jmuLightGold/90">
        Add, edit, and remove players and coaches, including drag-and-drop headshot uploads to
        rugby-media/headshots.
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
        <p className="mt-4 text-sm">Loading roster editor...</p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveSection("players")}
              className={`rounded border px-4 py-2 text-sm transition ${
                activeSection === "players"
                  ? "border-jmuGold bg-jmuGold/15 text-jmuGold"
                  : "border-jmuDarkGold/80 bg-jmuPurple/40 text-jmuLightGold hover:bg-jmuPurple/60"
              }`}
            >
              Players
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("coaches")}
              className={`rounded border px-4 py-2 text-sm transition ${
                activeSection === "coaches"
                  ? "border-jmuGold bg-jmuGold/15 text-jmuGold"
                  : "border-jmuDarkGold/80 bg-jmuPurple/40 text-jmuLightGold hover:bg-jmuPurple/60"
              }`}
            >
              Coaches
            </button>
          </div>

          {activeSection === "players" && (
            <div className="grid gap-4 xl:grid-cols-[1.2fr,1fr]">
              <div className="rounded border border-jmuDarkGold/70 bg-jmuPurple/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-jmuGold">Current Players</h4>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={resetPlayerForm}
                    className="rounded border border-jmuLightGold px-3 py-1 text-xs hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    New player
                  </button>
                </div>

                <div className="mt-4 rounded border border-jmuDarkGold/80 bg-jmuPurple/25 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h5 className="font-semibold text-jmuLightGold">Bulk CSV Upload</h5>
                      <p className="mt-1 text-xs text-jmuLightGold/80">
                        Upload the Google Form CSV, preview the cleaned roster, then confirm to replace all player rows.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => csvFileInputRef.current?.click()}
                      className="rounded border border-jmuLightGold px-3 py-1.5 text-xs hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Choose CSV
                    </button>
                  </div>

                  <input
                    ref={csvFileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handlePreviewCsvImport}
                  />

                  {csvImportFileName && (
                    <p className="mt-3 text-xs text-jmuLightGold/85">Previewing: {csvImportFileName}</p>
                  )}

                  {csvImportPreview && (
                    <div className="mt-3 space-y-3">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded border border-jmuDarkGold/70 bg-jmuPurple/30 px-3 py-2 text-xs">
                          <p className="uppercase tracking-wide text-jmuLightGold/70">Rows</p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {csvImportPreview.summary.valid} valid / {csvImportPreview.summary.parsed} parsed
                          </p>
                        </div>
                        <div className="rounded border border-jmuDarkGold/70 bg-jmuPurple/30 px-3 py-2 text-xs">
                          <p className="uppercase tracking-wide text-jmuLightGold/70">Changes</p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {csvImportPreview.summary.matched} matched, {csvImportPreview.summary.added} new
                          </p>
                        </div>
                        <div className="rounded border border-jmuDarkGold/70 bg-jmuPurple/30 px-3 py-2 text-xs">
                          <p className="uppercase tracking-wide text-jmuLightGold/70">Removed</p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {csvImportPreview.summary.removed} old player{csvImportPreview.summary.removed === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      {csvImportPreview.invalidRows.length > 0 && (
                        <div className="rounded border border-red-300/60 bg-red-100/10 p-3 text-xs text-red-100">
                          <p className="font-semibold text-red-100">
                            Fix these rows before replacing the roster:
                          </p>
                          <ul className="mt-2 space-y-2">
                            {csvImportPreview.invalidRows.map((row, index) => (
                              <li key={`${row.sourceRowNumber}-${index}`}>
                                Row {row.sourceRowNumber}
                                {row.name ? ` (${row.name})` : ""}: {row.messages.join(" ")}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="rounded border border-jmuDarkGold/70 bg-jmuPurple/30 p-3 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-jmuLightGold">
                            Preview sample
                          </p>
                          <p className="text-jmuLightGold/75">
                            Showing {Math.min(csvImportPreview.validRows.length, 6)} of {csvImportPreview.validRows.length} valid players
                          </p>
                        </div>

                        {csvImportPreview.validRows.length === 0 ? (
                          <p className="mt-2 text-jmuLightGold/80">No valid player rows are ready to import yet.</p>
                        ) : (
                          <ul className="mt-2 space-y-2">
                            {csvImportPreview.validRows.slice(0, 6).map((row) => (
                              <li
                                key={`${row.canonicalNameKey}-${row.sourceRowNumber}`}
                                className="rounded border border-jmuDarkGold/60 bg-jmuPurple/35 px-3 py-2"
                              >
                                <p className="font-semibold text-white">{row.name}</p>
                                <p className="text-jmuLightGold/80">
                                  {row.position || "No position"}{row.year ? ` - ${row.year}` : ""}
                                </p>
                                <p className="text-jmuLightGold/70">
                                  {row.major || "No major"}{row.hometown ? ` | ${row.hometown}` : ""}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={resetCsvImportState}
                          className="rounded border border-jmuLightGold px-3 py-1.5 text-xs hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Cancel preview
                        </button>
                        <button
                          type="button"
                          disabled={busy || csvImportPreview.invalidRows.length > 0 || csvImportPreview.validRows.length === 0}
                          onClick={handleReplaceRosterFromCsv}
                          className="rounded bg-jmuGold px-3 py-1.5 text-xs font-semibold text-jmuPurple transition hover:bg-jmuLightGold disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {busy ? "Replacing..." : "Replace roster"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {sortedPlayers.length === 0 ? (
                  <p className="mt-3 text-sm">No players yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {sortedPlayers.map((player) => (
                      <li
                        key={player.id}
                        className={`rounded border px-3 py-2 ${
                          editingPlayerId === player.id
                            ? "border-jmuGold bg-jmuGold/15"
                            : "border-jmuDarkGold/70 bg-jmuPurple/30"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{normalizeText(player.name) || `Player #${player.id}`}</p>
                            <p className="text-xs text-jmuLightGold/85">
                              {normalizeText(player.position) || "No position"}{" "}
                              {normalizeText(player.year) ? `- ${normalizeText(player.year)}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => startEditingPlayer(player)}
                              className="rounded border border-jmuLightGold px-2 py-1 text-xs hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleDeletePlayer(player)}
                              className="rounded border border-red-300 px-2 py-1 text-xs text-red-100 hover:bg-red-100/20 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded border border-jmuDarkGold/70 bg-jmuPurple/40 p-4">
                <h4 className="font-semibold text-jmuGold">
                  {editingPlayerId ? `Edit Player #${editingPlayerId}` : "Add Player"}
                </h4>
                <p className="mt-1 text-xs text-jmuLightGold/80">
                  Update player details and optionally replace or remove the headshot.
                </p>

                <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleSavePlayer}>
                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-wide">Name</span>
                    <input
                      required
                      value={playerForm.name}
                      onChange={(event) => setPlayerForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-wide">Position</span>
                    <input
                      required
                      value={playerForm.position}
                      onChange={(event) => setPlayerForm((prev) => ({ ...prev, position: event.target.value }))}
                      className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-wide">Year</span>
                    <input
                      value={playerForm.year}
                      onChange={(event) => setPlayerForm((prev) => ({ ...prev, year: event.target.value }))}
                      placeholder="Junior"
                      className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-wide">Major</span>
                    <input
                      value={playerForm.major}
                      onChange={(event) => setPlayerForm((prev) => ({ ...prev, major: event.target.value }))}
                      className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-wide">Hometown</span>
                    <input
                      value={playerForm.hometown}
                      onChange={(event) => setPlayerForm((prev) => ({ ...prev, hometown: event.target.value }))}
                      className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-wide">Height</span>
                    <input
                      value={playerForm.height}
                      onChange={(event) => setPlayerForm((prev) => ({ ...prev, height: event.target.value }))}
                      placeholder="6'1"
                      className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-wide">Weight</span>
                    <input
                      value={playerForm.weight}
                      onChange={(event) => setPlayerForm((prev) => ({ ...prev, weight: event.target.value }))}
                      placeholder="205"
                      className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="grid gap-1 sm:col-span-2">
                    <span className="text-xs uppercase tracking-wide">Bio</span>
                    <textarea
                      rows="4"
                      value={playerForm.bio}
                      onChange={(event) => setPlayerForm((prev) => ({ ...prev, bio: event.target.value }))}
                      className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                    />
                  </label>

                  <div className="sm:col-span-2">
                    <HeadshotDropzone
                      isDragging={playerDragging}
                      setIsDragging={setPlayerDragging}
                      onSelectFile={(files) => {
                        selectHeadshotFile(files, setPlayerHeadshotFile, "this player");
                        if ((files?.length || 0) > 0) {
                          setRemovePlayerHeadshot(false);
                        }
                      }}
                      inputRef={playerFileInputRef}
                      busy={busy}
                      selectedFile={playerHeadshotFile}
                      previewUrl={playerHeadshotPreviewUrl}
                      existingUrl={
                        removePlayerHeadshot ? "" : buildStoragePublicUrl(normalizeText(playerForm.headshot_url))
                      }
                      removeOnSave={removePlayerHeadshot}
                      onToggleRemove={setRemovePlayerHeadshot}
                      label="player"
                    />
                  </div>

                  <div className="sm:col-span-2 flex flex-wrap items-center justify-end gap-2">
                    {editingPlayerId && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={resetPlayerForm}
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
                      {busy ? "Saving..." : editingPlayerId ? "Save player" : "Add player"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeSection === "coaches" && (
            <div className="grid gap-4 xl:grid-cols-[1.2fr,1fr]">
              <div className="rounded border border-jmuDarkGold/70 bg-jmuPurple/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-jmuGold">Current Coaches</h4>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={resetCoachForm}
                    className="rounded border border-jmuLightGold px-3 py-1 text-xs hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    New coach
                  </button>
                </div>

                {sortedCoaches.length === 0 ? (
                  <p className="mt-3 text-sm">No coaches yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {sortedCoaches.map((coach) => (
                      <li
                        key={coach.id}
                        className={`rounded border px-3 py-2 ${
                          editingCoachId === coach.id
                            ? "border-jmuGold bg-jmuGold/15"
                            : "border-jmuDarkGold/70 bg-jmuPurple/30"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{normalizeText(coach.name) || `Coach #${coach.id}`}</p>
                            <p className="text-xs text-jmuLightGold/85">
                              {normalizeText(coach.position) || "No position"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => startEditingCoach(coach)}
                              className="rounded border border-jmuLightGold px-2 py-1 text-xs hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleDeleteCoach(coach)}
                              className="rounded border border-red-300 px-2 py-1 text-xs text-red-100 hover:bg-red-100/20 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded border border-jmuDarkGold/70 bg-jmuPurple/40 p-4">
                <h4 className="font-semibold text-jmuGold">
                  {editingCoachId ? `Edit Coach #${editingCoachId}` : "Add Coach"}
                </h4>
                <p className="mt-1 text-xs text-jmuLightGold/80">
                  Update coach details and optionally replace or remove the headshot.
                </p>

                <form className="mt-4 grid gap-3" onSubmit={handleSaveCoach}>
                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-wide">Name</span>
                    <input
                      required
                      value={coachForm.name}
                      onChange={(event) => setCoachForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-wide">Position</span>
                    <input
                      required
                      value={coachForm.position}
                      onChange={(event) => setCoachForm((prev) => ({ ...prev, position: event.target.value }))}
                      placeholder="Head Coach"
                      className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-wide">Bio</span>
                    <textarea
                      rows="5"
                      value={coachForm.bio}
                      onChange={(event) => setCoachForm((prev) => ({ ...prev, bio: event.target.value }))}
                      className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                    />
                  </label>
                  <HeadshotDropzone
                    isDragging={coachDragging}
                    setIsDragging={setCoachDragging}
                    onSelectFile={(files) => {
                      selectHeadshotFile(files, setCoachHeadshotFile, "this coach");
                      if ((files?.length || 0) > 0) {
                        setRemoveCoachHeadshot(false);
                      }
                    }}
                    inputRef={coachFileInputRef}
                    busy={busy}
                    selectedFile={coachHeadshotFile}
                    previewUrl={coachHeadshotPreviewUrl}
                    existingUrl={
                      removeCoachHeadshot ? "" : buildStoragePublicUrl(normalizeText(coachForm.headshot_url))
                    }
                    removeOnSave={removeCoachHeadshot}
                    onToggleRemove={setRemoveCoachHeadshot}
                    label="coach"
                  />

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {editingCoachId && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={resetCoachForm}
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
                      {busy ? "Saving..." : editingCoachId ? "Save coach" : "Add coach"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
