import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  MEDIA_FILE_URL_COLUMNS,
  MEDIA_HOME_CAROUSEL_COLUMNS,
  MEDIA_UPLOAD_TIMESTAMP_COLUMNS,
  extractStorageObjectPath,
  formatSeasonLabel,
  getMediaFilePath,
  getMediaStoredPath,
  normalizeSeasonId,
  sanitizeAlbumName,
  sanitizeFileName,
  sortSeasonIdsDesc,
} from "../../lib/mediaUtils";
import { deleteR2Objects, moveR2Object, uploadFileToR2 } from "../../lib/storageUtils";

const MEDIA_BUCKET = "rugby-media";

const detectExistingColumn = async (tableName, candidates) => {
  for (const columnName of candidates) {
    const { error } = await supabase.from(tableName).select(columnName).limit(1);
    if (!error) return columnName;
  }

  return "";
};

const getNextMediaId = async () => {
  const { data, error } = await supabase
    .from("media")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.id ?? 0) + 1;
};

const toUserFriendlyMediaError = (error, fallbackMessage) => {
  const rawMessage = error?.message || fallbackMessage;
  const isRlsError = /row-level security|violates row-level security|permission denied/i.test(
    String(rawMessage)
  );

  if (!isRlsError) return rawMessage;

  return `${fallbackMessage} Supabase blocked this write with RLS. Run docs/supabase_media_admin_rls.sql and confirm this user is in public.admins.`;
};

export default function MediaEditor() {
  const [mediaRows, setMediaRows] = useState([]);
  const [seasonNames, setSeasonNames] = useState({});
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [mediaStatus, setMediaStatus] = useState("");

  const [filePathColumn, setFilePathColumn] = useState("");
  const [uploadTimestampColumn, setUploadTimestampColumn] = useState("");
  const [homeCarouselColumn, setHomeCarouselColumn] = useState("");

  const [uploadAlbumMode, setUploadAlbumMode] = useState("existing");
  const [selectedAlbum, setSelectedAlbum] = useState("");
  const [newAlbum, setNewAlbum] = useState("");
  const [uploadSeasonMode, setUploadSeasonMode] = useState("existing");
  const [selectedSeason, setSelectedSeason] = useState("");
  const [newSeason, setNewSeason] = useState("");
  const [uploadFeatured, setUploadFeatured] = useState(false);
  const [uploadHomeCarousel, setUploadHomeCarousel] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const [seasonFilter, setSeasonFilter] = useState("all");
  const [managedAlbum, setManagedAlbum] = useState("");
  const [albumEditName, setAlbumEditName] = useState("");
  const [albumEditSeason, setAlbumEditSeason] = useState("");

  const fileInputRef = useRef(null);

  const albumGroups = useMemo(() => {
    const byAlbum = mediaRows.reduce((acc, row) => {
      const album = String(row.album || "").trim();
      if (!album) return acc;
      if (!acc[album]) {
        acc[album] = {
          album,
          rows: [],
          seasonIds: new Set(),
          latestUpload: null,
        };
      }

      acc[album].rows.push(row);
      const seasonId = normalizeSeasonId(row.season_id);
      if (seasonId) acc[album].seasonIds.add(seasonId);

      const uploadedValue =
        row.upload_date || row.uploaded_at || row.uploaded || row.created_at || null;
      if (!acc[album].latestUpload || (uploadedValue && uploadedValue > acc[album].latestUpload)) {
        acc[album].latestUpload = uploadedValue;
      }

      return acc;
    }, {});

    return Object.values(byAlbum).sort((a, b) => a.album.localeCompare(b.album));
  }, [mediaRows]);

  const albumOptions = useMemo(
    () => albumGroups.map((group) => group.album),
    [albumGroups]
  );

  const seasonOptions = useMemo(() => {
    const fromMedia = mediaRows
      .map((row) => normalizeSeasonId(row.season_id))
      .filter(Boolean);
    const fromMatches = Object.keys(seasonNames);
    return sortSeasonIdsDesc(Array.from(new Set([...fromMatches, ...fromMedia])));
  }, [mediaRows, seasonNames]);

  const filteredAlbumGroups = useMemo(() => {
    if (seasonFilter === "all") return albumGroups;
    return albumGroups.filter((group) => group.rows.some((row) => normalizeSeasonId(row.season_id) === seasonFilter));
  }, [albumGroups, seasonFilter]);

  const activeManagedAlbum = useMemo(
    () => albumGroups.find((group) => group.album === managedAlbum) || null,
    [albumGroups, managedAlbum]
  );

  const loadMediaData = async () => {
    setMediaLoading(true);
    setMediaError("");

    try {
      const [detectedFilePathColumn, detectedTimestampColumn, detectedCarouselColumn] = await Promise.all([
        detectExistingColumn("media", MEDIA_FILE_URL_COLUMNS),
        detectExistingColumn("media", MEDIA_UPLOAD_TIMESTAMP_COLUMNS),
        detectExistingColumn("media", MEDIA_HOME_CAROUSEL_COLUMNS),
      ]);

      if (!detectedFilePathColumn) {
        throw new Error(
          "Unable to find media URL column. Expected `file_path` or `filepath` on the media table."
        );
      }

      setFilePathColumn(detectedFilePathColumn);
      setUploadTimestampColumn(detectedTimestampColumn);
      setHomeCarouselColumn(detectedCarouselColumn);

      const [{ data: mediaData, error: mediaErrorRes }, { data: seasonData }] = await Promise.all([
        supabase.from("media").select("*").order("id", { ascending: false }),
        supabase.from("matches").select("season_id, season_name"),
      ]);

      if (mediaErrorRes) throw mediaErrorRes;

      const normalizedRows = (mediaData || []).map((row) => ({
        ...row,
        season_id: normalizeSeasonId(row.season_id),
      }));

      setMediaRows(normalizedRows);

      const seasonLookup = {};
      for (const row of seasonData || []) {
        const seasonId = normalizeSeasonId(row.season_id);
        if (!seasonId) continue;
        seasonLookup[seasonId] = row.season_name || formatSeasonLabel(seasonId);
      }
      setSeasonNames(seasonLookup);
    } catch (error) {
      setMediaError(error.message || "Unable to load media editor data.");
    } finally {
      setMediaLoading(false);
    }
  };

  useEffect(() => {
    loadMediaData();
  }, []);

  useEffect(() => {
    if (!albumOptions.length) return;
    if (!selectedAlbum || !albumOptions.includes(selectedAlbum)) {
      setSelectedAlbum(albumOptions[0]);
    }
  }, [albumOptions, selectedAlbum]);

  useEffect(() => {
    if (!seasonOptions.length) return;
    if (!selectedSeason || !seasonOptions.includes(selectedSeason)) {
      setSelectedSeason(seasonOptions[0]);
    }
  }, [seasonOptions, selectedSeason]);

  useEffect(() => {
    if (uploadAlbumMode !== "existing" || !selectedAlbum) return;

    const matchedAlbum = albumGroups.find((group) => group.album === selectedAlbum);
    if (!matchedAlbum) return;

    const albumSeason = sortSeasonIdsDesc(Array.from(matchedAlbum.seasonIds))[0];
    if (!albumSeason) return;

    setUploadSeasonMode("existing");
    setSelectedSeason((current) => (current === albumSeason ? current : albumSeason));
  }, [uploadAlbumMode, selectedAlbum, albumGroups]);

  useEffect(() => {
    if (!filteredAlbumGroups.length) {
      setManagedAlbum("");
      return;
    }

    const stillVisible = filteredAlbumGroups.some((group) => group.album === managedAlbum);
    if (!managedAlbum || !stillVisible) {
      setManagedAlbum(filteredAlbumGroups[0].album);
    }
  }, [filteredAlbumGroups, managedAlbum]);

  useEffect(() => {
    if (!activeManagedAlbum) {
      setAlbumEditName("");
      setAlbumEditSeason("");
      return;
    }

    setAlbumEditName(activeManagedAlbum.album);
    const primarySeason = sortSeasonIdsDesc(Array.from(activeManagedAlbum.seasonIds))[0] || "";
    setAlbumEditSeason(primarySeason);
  }, [activeManagedAlbum]);

  useEffect(() => {
    if (!homeCarouselColumn) {
      setUploadHomeCarousel(false);
    }
  }, [homeCarouselColumn]);

  const queueFiles = (incomingFileList) => {
    const imageFiles = Array.from(incomingFileList || []).filter((file) => file.type.startsWith("image/"));
    const skippedCount = (incomingFileList?.length || 0) - imageFiles.length;

    setQueuedFiles((prev) => {
      const keySet = new Set(prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      const uniqueIncoming = imageFiles.filter((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        return !keySet.has(key);
      });
      return [...prev, ...uniqueIncoming];
    });

    if (skippedCount > 0) {
      setMediaError(`Ignored ${skippedCount} non-image file(s).`);
    } else {
      setMediaError("");
    }
    setMediaStatus("");
  };

  const handleUpload = async () => {
    setMediaError("");
    setMediaStatus("");

    const resolvedAlbum =
      uploadAlbumMode === "existing" ? selectedAlbum : sanitizeAlbumName(newAlbum);
    const resolvedSeason =
      uploadSeasonMode === "existing" ? normalizeSeasonId(selectedSeason) : normalizeSeasonId(newSeason);

    if (!resolvedAlbum) {
      setMediaError("Select an existing album or enter a new album name.");
      return;
    }

    if (!resolvedSeason) {
      setMediaError("Select an existing season or enter a season id (for example: fall-2026).");
      return;
    }

    if (!queuedFiles.length) {
      setMediaError("Add at least one image before uploading.");
      return;
    }

    if (!filePathColumn) {
      setMediaError("Unable to determine the media URL column. Reload the page and try again.");
      return;
    }

    setMediaBusy(true);

    const uploadedObjectPaths = [];

    try {
      const nextId = await getNextMediaId();
      const rowsToInsert = [];

      for (let index = 0; index < queuedFiles.length; index += 1) {
        const file = queuedFiles[index];
        const objectPath = `${resolvedAlbum}/${Date.now()}-${index}-${sanitizeFileName(file.name)}`;

        await uploadFileToR2(file, objectPath);

        uploadedObjectPaths.push(objectPath);

        const row = {
          id: nextId + index,
          album: resolvedAlbum,
          season_id: resolvedSeason,
          featured: uploadFeatured,
        };

        row[filePathColumn] = objectPath;
        if (homeCarouselColumn) {
          row[homeCarouselColumn] = uploadHomeCarousel;
        }
        if (uploadTimestampColumn) {
          row[uploadTimestampColumn] = new Date().toISOString();
        }

        rowsToInsert.push(row);
      }

      const { error: insertError } = await supabase.from("media").insert(rowsToInsert);
      if (insertError) throw insertError;

      setQueuedFiles([]);
      setMediaStatus(
        `Uploaded ${rowsToInsert.length} image${rowsToInsert.length === 1 ? "" : "s"} to ${resolvedAlbum}.`
      );
      setSelectedAlbum(resolvedAlbum);
      setSelectedSeason(resolvedSeason);
      setUploadAlbumMode("existing");
      setUploadSeasonMode("existing");
      setNewAlbum("");
      setNewSeason("");
      await loadMediaData();
    } catch (error) {
      if (uploadedObjectPaths.length) {
        await deleteR2Objects(uploadedObjectPaths);
      }
      setMediaError(toUserFriendlyMediaError(error, "Unable to upload selected images."));
    } finally {
      setMediaBusy(false);
    }
  };

  const handleDeletePhoto = async (photo) => {
    if (!window.confirm("Delete this photo from both the album and storage?")) return;

    setMediaBusy(true);
    setMediaError("");
    setMediaStatus("");

    try {
      const filePath = getMediaStoredPath(photo);
      const objectPath = extractStorageObjectPath(filePath, MEDIA_BUCKET);
      if (!objectPath) {
        throw new Error(
          "Could not determine this image's storage path, so row deletion was canceled to avoid leaving an orphaned file."
        );
      }

      await deleteR2Objects([objectPath]);

      const { error } = await supabase.from("media").delete().eq("id", photo.id);
      if (error) throw error;

      setMediaStatus("Photo deleted.");
      await loadMediaData();
    } catch (error) {
      setMediaError(toUserFriendlyMediaError(error, "Unable to delete this photo."));
    } finally {
      setMediaBusy(false);
    }
  };

  const handleDeleteAlbum = async () => {
    if (!activeManagedAlbum) return;
    if (
      !window.confirm(
        `Delete album "${activeManagedAlbum.album}" and all ${activeManagedAlbum.rows.length} photo(s)?`
      )
    ) {
      return;
    }

    setMediaBusy(true);
    setMediaError("");
    setMediaStatus("");

    try {
      const objectPathRows = activeManagedAlbum.rows.map((row) => ({
        id: row.id,
        objectPath: extractStorageObjectPath(getMediaStoredPath(row), MEDIA_BUCKET),
      }));
      const unresolvedRows = objectPathRows.filter((row) => !row.objectPath);
      if (unresolvedRows.length > 0) {
        throw new Error(
          `Could not determine storage paths for ${unresolvedRows.length} file(s), so album deletion was canceled to avoid orphaned files.`
        );
      }

      const objectPaths = objectPathRows.map((row) => row.objectPath);

      if (objectPaths.length) {
        await deleteR2Objects(objectPaths);
      }

      const { error: deleteError } = await supabase.from("media").delete().eq("album", activeManagedAlbum.album);
      if (deleteError) throw deleteError;

      setMediaStatus(`Album "${activeManagedAlbum.album}" deleted.`);
      await loadMediaData();
    } catch (error) {
      setMediaError(toUserFriendlyMediaError(error, "Unable to delete this album."));
    } finally {
      setMediaBusy(false);
    }
  };

  const handleSaveAlbumDetails = async () => {
    if (!activeManagedAlbum) return;

    const nextAlbumName = sanitizeAlbumName(albumEditName);
    const nextSeasonId = normalizeSeasonId(albumEditSeason);

    if (!nextAlbumName) {
      setMediaError("Album name cannot be empty.");
      return;
    }

    if (!nextSeasonId) {
      setMediaError("Season id cannot be empty.");
      return;
    }

    setMediaBusy(true);
    setMediaError("");
    setMediaStatus("");

    try {
      const albumChanged = nextAlbumName !== activeManagedAlbum.album;

      for (const row of activeManagedAlbum.rows) {
        const payload = {
          album: nextAlbumName,
          season_id: nextSeasonId,
        };

        if (albumChanged) {
          const currentPath = extractStorageObjectPath(getMediaStoredPath(row), MEDIA_BUCKET);
          if (currentPath) {
            const baseName = sanitizeFileName(currentPath.split("/").pop() || `${row.id}.jpg`);
            const nextPath = `${nextAlbumName}/${row.id}-${baseName}`;
            if (currentPath !== nextPath) {
              await moveR2Object(currentPath, nextPath);

              if (filePathColumn) {
                payload[filePathColumn] = nextPath;
              }
            }
          }
        }

        const { error: updateError } = await supabase.from("media").update(payload).eq("id", row.id);
        if (updateError) throw updateError;
      }

      setMediaStatus(`Album updated to "${nextAlbumName}" (${nextSeasonId}).`);
      setManagedAlbum(nextAlbumName);
      await loadMediaData();
    } catch (error) {
      setMediaError(toUserFriendlyMediaError(error, "Unable to update album details."));
    } finally {
      setMediaBusy(false);
    }
  };

  const handleToggleFeatured = async (photo) => {
    setMediaBusy(true);
    setMediaError("");
    setMediaStatus("");

    try {
      const { error } = await supabase
        .from("media")
        .update({ featured: !photo.featured })
        .eq("id", photo.id);

      if (error) throw error;

      setMediaRows((prev) =>
        prev.map((row) => (row.id === photo.id ? { ...row, featured: !row.featured } : row))
      );
    } catch (error) {
      setMediaError(toUserFriendlyMediaError(error, "Unable to update featured gallery status."));
    } finally {
      setMediaBusy(false);
    }
  };

  const handleToggleHomeCarousel = async (photo) => {
    if (!homeCarouselColumn) {
      setMediaError(
        "Home carousel column not found on media table. Run docs/supabase_home_carousel.sql, then reload."
      );
      return;
    }

    setMediaBusy(true);
    setMediaError("");
    setMediaStatus("");

    try {
      const nextValue = !photo[homeCarouselColumn];
      const { error } = await supabase
        .from("media")
        .update({ [homeCarouselColumn]: nextValue })
        .eq("id", photo.id);

      if (error) throw error;

      setMediaRows((prev) =>
        prev.map((row) => (row.id === photo.id ? { ...row, [homeCarouselColumn]: nextValue } : row))
      );
    } catch (error) {
      setMediaError(toUserFriendlyMediaError(error, "Unable to update home carousel status."));
    } finally {
      setMediaBusy(false);
    }
  };

  return (
    <>
      <h3 className="text-xl font-semibold text-jmuGold">Media Editor</h3>
      <p className="mt-1 text-sm text-jmuLightGold/90">
        Upload single or multiple images, create or reuse albums, edit album details, and remove
        photos or entire albums.
      </p>

      {mediaError && (
        <div className="mt-4 rounded border border-red-300 bg-red-100/10 px-4 py-3 text-red-200">
          {mediaError}
        </div>
      )}

      {mediaStatus && (
        <div className="mt-4 rounded border border-green-300 bg-green-100/10 px-4 py-3 text-green-100">
          {mediaStatus}
        </div>
      )}

      {mediaLoading ? (
        <p className="mt-4 text-sm">Loading media editor...</p>
      ) : (
        <div className="mt-4 space-y-6">
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded border border-jmuDarkGold/70 bg-jmuPurple/40 p-4">
              <h4 className="font-semibold text-jmuGold">Upload Photos</h4>
              <p className="mt-1 text-xs text-jmuLightGold/80">
                Choose one image for an individual upload, or select many for bulk upload.
              </p>

              <div className="mt-4 grid gap-3">
                <label className="grid gap-1 text-xs uppercase tracking-wide">
                  Album Source
                  <select
                    value={uploadAlbumMode}
                    onChange={(event) => setUploadAlbumMode(event.target.value)}
                    className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm normal-case"
                  >
                    <option value="existing">Existing album</option>
                    <option value="new">Create new album</option>
                  </select>
                </label>

                {uploadAlbumMode === "existing" ? (
                  <label className="grid gap-1 text-xs uppercase tracking-wide">
                    Album
                    <select
                      value={selectedAlbum}
                      onChange={(event) => setSelectedAlbum(event.target.value)}
                      className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm normal-case"
                    >
                      {albumOptions.length === 0 ? (
                        <option value="">No albums yet</option>
                      ) : (
                        albumOptions.map((album) => (
                          <option key={album} value={album}>
                            {album}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                ) : (
                  <label className="grid gap-1 text-xs uppercase tracking-wide">
                    New Album Name
                    <input
                      value={newAlbum}
                      onChange={(event) => setNewAlbum(event.target.value)}
                      placeholder="camp-2026"
                      className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm normal-case"
                    />
                  </label>
                )}

                <label className="grid gap-1 text-xs uppercase tracking-wide">
                  Season Source
                  <select
                    value={uploadSeasonMode}
                    onChange={(event) => setUploadSeasonMode(event.target.value)}
                    className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm normal-case"
                  >
                    <option value="existing">Existing season</option>
                    <option value="new">Create new season id</option>
                  </select>
                </label>

                {uploadSeasonMode === "existing" ? (
                  <label className="grid gap-1 text-xs uppercase tracking-wide">
                    Season
                    <select
                      value={selectedSeason}
                      onChange={(event) => setSelectedSeason(event.target.value)}
                      className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm normal-case"
                    >
                      {seasonOptions.length === 0 ? (
                        <option value="">No seasons yet</option>
                      ) : (
                        seasonOptions.map((seasonId) => (
                          <option key={seasonId} value={seasonId}>
                            {formatSeasonLabel(seasonId, seasonNames)}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                ) : (
                  <label className="grid gap-1 text-xs uppercase tracking-wide">
                    New Season ID
                    <input
                      value={newSeason}
                      onChange={(event) => setNewSeason(event.target.value)}
                      placeholder="fall-2026"
                      className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm normal-case"
                    />
                  </label>
                )}

                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={uploadFeatured}
                    onChange={(event) => setUploadFeatured(event.target.checked)}
                  />
                  Mark uploaded images as featured gallery photos
                </label>

                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={uploadHomeCarousel}
                    onChange={(event) => setUploadHomeCarousel(event.target.checked)}
                    disabled={!homeCarouselColumn}
                  />
                  Mark uploaded images for homepage carousel
                </label>
                {!homeCarouselColumn && (
                  <p className="text-xs text-jmuLightGold/70">
                    Home carousel column not detected. Run docs/supabase_home_carousel.sql to enable
                    this feature.
                  </p>
                )}

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
                    queueFiles(event.dataTransfer.files);
                  }}
                  className={`rounded border-2 border-dashed px-4 py-6 text-center transition ${
                    isDragging
                      ? "border-jmuGold bg-jmuGold/10"
                      : "border-jmuDarkGold/80 bg-jmuPurple/20"
                  }`}
                >
                  <p className="text-sm">Drag and drop images here</p>
                  <p className="mt-1 text-xs text-jmuLightGold/80">or</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 rounded border border-jmuLightGold px-3 py-1 text-sm hover:bg-jmuLightGold hover:text-jmuPurple"
                  >
                    Choose files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      queueFiles(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </div>

                {queuedFiles.length > 0 && (
                  <div className="rounded border border-jmuDarkGold/80 bg-jmuPurple/20 p-3">
                    <p className="text-sm font-semibold">
                      Ready to upload: {queuedFiles.length} file{queuedFiles.length === 1 ? "" : "s"}
                    </p>
                    <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs text-jmuLightGold/90">
                      {queuedFiles.map((file) => (
                        <li key={`${file.name}-${file.size}-${file.lastModified}`}>{file.name}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => setQueuedFiles([])}
                      className="mt-3 rounded border border-jmuLightGold px-3 py-1 text-xs hover:bg-jmuLightGold hover:text-jmuPurple"
                    >
                      Clear selected files
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  disabled={mediaBusy}
                  onClick={handleUpload}
                  className="rounded bg-jmuGold px-4 py-2 font-semibold text-jmuPurple transition hover:bg-jmuLightGold disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {mediaBusy ? "Uploading..." : "Upload photos"}
                </button>
              </div>
            </div>

            <div className="rounded border border-jmuDarkGold/70 bg-jmuPurple/40 p-4">
              <h4 className="font-semibold text-jmuGold">Album Details</h4>
              <p className="mt-1 text-xs text-jmuLightGold/80">
                Rename albums, update season metadata, or delete an entire album.
              </p>

              {filteredAlbumGroups.length === 0 ? (
                <p className="mt-4 text-sm">No albums available.</p>
              ) : (
                <div className="mt-4 grid gap-3">
                  <label className="grid gap-1 text-xs uppercase tracking-wide">
                    Select Album
                    <select
                      value={managedAlbum}
                      onChange={(event) => setManagedAlbum(event.target.value)}
                      className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm normal-case"
                    >
                      {filteredAlbumGroups.map((group) => (
                        <option key={group.album} value={group.album}>
                          {group.album} ({group.rows.length})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-xs uppercase tracking-wide">
                    Album Name
                    <input
                      value={albumEditName}
                      onChange={(event) => setAlbumEditName(event.target.value)}
                      className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm normal-case"
                    />
                  </label>

                  <label className="grid gap-1 text-xs uppercase tracking-wide">
                    Season ID
                    <input
                      value={albumEditSeason}
                      onChange={(event) => setAlbumEditSeason(event.target.value)}
                      placeholder="fall-2026"
                      className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm normal-case"
                    />
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={mediaBusy}
                      onClick={handleSaveAlbumDetails}
                      className="rounded bg-jmuGold px-4 py-2 text-sm font-semibold text-jmuPurple transition hover:bg-jmuLightGold disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {mediaBusy ? "Saving..." : "Save album details"}
                    </button>
                    <button
                      type="button"
                      disabled={mediaBusy}
                      onClick={handleDeleteAlbum}
                      className="rounded border border-red-300 px-4 py-2 text-sm text-red-100 hover:bg-red-100/20 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Delete album
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded border border-jmuDarkGold/70 bg-jmuPurple/40 p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h4 className="font-semibold text-jmuGold">Existing Albums and Photos</h4>
              <label className="grid gap-1 text-xs uppercase tracking-wide text-jmuLightGold/90">
                Filter by season
                <select
                  value={seasonFilter}
                  onChange={(event) => setSeasonFilter(event.target.value)}
                  className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm normal-case"
                >
                  <option value="all">All seasons</option>
                  {seasonOptions.map((seasonId) => (
                    <option key={seasonId} value={seasonId}>
                      {formatSeasonLabel(seasonId, seasonNames)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {filteredAlbumGroups.length === 0 ? (
              <p className="mt-4 text-sm">No albums found for this filter.</p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {filteredAlbumGroups.map((group) => {
                  const seasonList = sortSeasonIdsDesc(Array.from(group.seasonIds));
                  return (
                    <button
                      key={group.album}
                      type="button"
                      onClick={() => setManagedAlbum(group.album)}
                      className={`rounded border px-3 py-3 text-left transition ${
                        managedAlbum === group.album
                          ? "border-jmuGold bg-jmuGold/15"
                          : "border-jmuDarkGold/70 bg-jmuPurple/30 hover:bg-jmuPurple/50"
                      }`}
                    >
                      <p className="font-semibold">{group.album}</p>
                      <p className="mt-1 text-xs text-jmuLightGold/80">
                        {group.rows.length} photo{group.rows.length === 1 ? "" : "s"} -{" "}
                        {seasonList.map((seasonId) => formatSeasonLabel(seasonId, seasonNames)).join(", ")}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {activeManagedAlbum && (
              <div className="mt-5">
                <h5 className="font-semibold text-jmuGold">
                  Photos in {activeManagedAlbum.album} ({activeManagedAlbum.rows.length})
                </h5>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {activeManagedAlbum.rows
                    .slice()
                    .sort((a, b) => Number(b.id) - Number(a.id))
                    .map((photo) => (
                      <div
                        key={photo.id}
                        className="rounded border border-jmuDarkGold/70 bg-jmuPurple/20 p-2"
                      >
                        <img
                          src={getMediaFilePath(photo)}
                          alt={photo.album || "media item"}
                          className="h-40 w-full rounded object-cover"
                        />
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span>
                            #{photo.id} - {formatSeasonLabel(photo.season_id, seasonNames)}
                          </span>
                          <label className="inline-flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={Boolean(photo.featured)}
                              onChange={() => handleToggleFeatured(photo)}
                              disabled={mediaBusy}
                            />
                            Featured Gallery
                          </label>
                          <label className="inline-flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={Boolean(homeCarouselColumn && photo[homeCarouselColumn])}
                              onChange={() => handleToggleHomeCarousel(photo)}
                              disabled={mediaBusy || !homeCarouselColumn}
                            />
                            Home Carousel
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(photo)}
                          disabled={mediaBusy}
                          className="mt-2 w-full rounded border border-red-300 px-2 py-1 text-xs text-red-100 hover:bg-red-100/20 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Remove photo
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
