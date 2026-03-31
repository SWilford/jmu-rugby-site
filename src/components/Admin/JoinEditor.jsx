import { useEffect, useMemo, useState } from "react";
import JOIN_INFO_FALLBACK from "../../data/joinInfo";
import { supabase } from "../../lib/supabaseClient";

const EDITABLE_SETTING_KEYS = [
  "join_title",
  "join_intro",
  "dues",
  "travel",
  "who_can_join",
  "fall_season",
  "spring_season",
  "required_gear",
  "recommended_gear",
  "lifting",
  "conditioning",
];

const SETTING_LABELS = {
  join_title: "Join Title",
  join_intro: "Join Intro",
  dues: "Dues",
  travel: "Travel",
  who_can_join: "Who Can Join",
  fall_season: "Fall Season",
  spring_season: "Spring Season",
  required_gear: "Required Gear",
  recommended_gear: "Recommended Gear",
  lifting: "Lifting Note",
  conditioning: "Conditioning Detail",
};

const SETTING_DESCRIPTIONS = {
  join_title: "Main H1 title shown at the top of the Join page.",
  join_intro: "Intro paragraph directly below the title.",
  dues: "Short dues value (example: $200).",
  travel: "Travel expectations and logistics copy.",
  who_can_join: "Eligibility paragraph in Gear & Expectations.",
  fall_season: "Fall season summary line.",
  spring_season: "Spring season summary line.",
  required_gear: 'Noun phrase only (example: "Mouthguard").',
  recommended_gear: 'Noun phrase only (example: "Cleats and rugby shorts").',
  lifting: "Lifting expectations line.",
  conditioning: "Fallback conditioning detail used by Join content mapping.",
};

const MULTILINE_SETTING_KEYS = new Set([
  "join_intro",
  "travel",
  "who_can_join",
  "fall_season",
  "spring_season",
  "lifting",
  "conditioning",
]);

const SETTING_DEFAULT_VALUES = {
  join_title: JOIN_INFO_FALLBACK.title,
  join_intro: JOIN_INFO_FALLBACK.intro,
  dues: JOIN_INFO_FALLBACK.dues,
  travel: JOIN_INFO_FALLBACK.travel,
  who_can_join: JOIN_INFO_FALLBACK.eligibility,
  fall_season: JOIN_INFO_FALLBACK.seasons[0],
  spring_season: JOIN_INFO_FALLBACK.seasons[1],
  required_gear: "Mouthguard",
  recommended_gear: "Cleats and rugby shorts",
  lifting: JOIN_INFO_FALLBACK.gear[2],
  conditioning: "Monday and Wednesday conditioning sessions.",
};

const EMPTY_SCHEDULE_FORM = {
  label: "",
  detail: "",
  display_order: "",
};

const EMPTY_FAQ_FORM = {
  question: "",
  answer: "",
  display_order: "",
  is_active: true,
};

const normalizeText = (value) => String(value || "").trim();

const toUserFriendlyJoinError = (error, fallbackMessage) => {
  const rawMessage = error?.message || fallbackMessage;
  const message = String(rawMessage);
  const isRlsError = /row-level security|violates row-level security|permission denied/i.test(message);
  const isMissingTableError = /relation .*join_content_|relation .*admins/i.test(message);

  if (isMissingTableError) {
    return `${fallbackMessage} Join content tables were not found. Run docs/supabase_join_dynamic_content.sql, then reload this page.`;
  }

  if (!isRlsError) return message;
  return `${fallbackMessage} Supabase blocked this write with RLS. Run docs/supabase_join_dynamic_content.sql and confirm this user is in public.admins.`;
};

const getDefaultDisplayOrder = (rows) => {
  const maxOrder = rows.reduce((maxValue, row) => Math.max(maxValue, Number(row.display_order || 0)), 0);
  return maxOrder + 1;
};

export default function JoinEditor() {
  const [settingsRows, setSettingsRows] = useState([]);
  const [scheduleRows, setScheduleRows] = useState([]);
  const [faqRows, setFaqRows] = useState([]);

  const [settingsDrafts, setSettingsDrafts] = useState({});
  const [scheduleForm, setScheduleForm] = useState(EMPTY_SCHEDULE_FORM);
  const [faqForm, setFaqForm] = useState(EMPTY_FAQ_FORM);

  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [editingFaqId, setEditingFaqId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [faqBusy, setFaqBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const sortedSettings = useMemo(() => {
    const byKey = new Map(settingsRows.map((row) => [row.key, row]));
    const orderedRows = EDITABLE_SETTING_KEYS.map((key) => {
      const existing = byKey.get(key);
      if (existing) return existing;
      return {
        id: null,
        key,
        value: SETTING_DEFAULT_VALUES[key] ?? "",
        description: SETTING_DESCRIPTIONS[key] || "",
      };
    });

    const additionalRows = settingsRows
      .filter((row) => !EDITABLE_SETTING_KEYS.includes(row.key))
      .sort((a, b) => String(a.key).localeCompare(String(b.key)));

    return [...orderedRows, ...additionalRows];
  }, [settingsRows]);

  const sortedScheduleRows = useMemo(
    () =>
      scheduleRows
        .slice()
        .sort((a, b) => {
          const orderCompare = Number(a.display_order || 0) - Number(b.display_order || 0);
          if (orderCompare !== 0) return orderCompare;
          return normalizeText(a.label).localeCompare(normalizeText(b.label), undefined, {
            sensitivity: "base",
          });
        }),
    [scheduleRows]
  );

  const sortedFaqRows = useMemo(
    () =>
      faqRows
        .slice()
        .sort((a, b) => {
          const orderCompare = Number(a.display_order || 0) - Number(b.display_order || 0);
          if (orderCompare !== 0) return orderCompare;
          return normalizeText(a.question).localeCompare(normalizeText(b.question), undefined, {
            sensitivity: "base",
          });
        }),
    [faqRows]
  );

  useEffect(() => {
    const nextDrafts = sortedSettings.reduce((drafts, row) => {
      drafts[row.key] = normalizeText(row.value);
      return drafts;
    }, {});
    setSettingsDrafts(nextDrafts);
  }, [sortedSettings]);

  const loadContent = async () => {
    setLoading(true);
    setError("");

    const [settingsResponse, scheduleResponse, faqResponse] = await Promise.all([
      supabase.from("join_content_settings").select("id, key, value, description"),
      supabase
        .from("join_content_schedule")
        .select("id, label, detail, display_order")
        .order("display_order", { ascending: true })
        .order("updated_at", { ascending: false }),
      supabase
        .from("join_content_faq")
        .select("id, question, answer, display_order, is_active")
        .order("display_order", { ascending: true })
        .order("updated_at", { ascending: false }),
    ]);

    if (settingsResponse.error || scheduleResponse.error || faqResponse.error) {
      const firstError = settingsResponse.error || scheduleResponse.error || faqResponse.error;
      setError(toUserFriendlyJoinError(firstError, "Unable to load join editor content."));
      setLoading(false);
      return;
    }

    setSettingsRows(settingsResponse.data || []);
    setScheduleRows(scheduleResponse.data || []);
    setFaqRows(faqResponse.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadContent();
  }, []);

  const resetScheduleForm = () => {
    setEditingScheduleId(null);
    setScheduleForm({
      ...EMPTY_SCHEDULE_FORM,
      display_order: getDefaultDisplayOrder(scheduleRows),
    });
  };

  const resetFaqForm = () => {
    setEditingFaqId(null);
    setFaqForm({
      ...EMPTY_FAQ_FORM,
      display_order: getDefaultDisplayOrder(faqRows),
    });
  };

  const handleSaveSettings = async (event) => {
    event.preventDefault();
    setSettingsBusy(true);
    setError("");
    setStatus("");

    const payload = sortedSettings.map((row) => ({
      key: row.key,
      value: normalizeText(settingsDrafts[row.key]),
      description: row.description || SETTING_DESCRIPTIONS[row.key] || null,
    }));

    const hasEmptyRequiredValue = payload.some((row) => !row.value);
    if (hasEmptyRequiredValue) {
      setSettingsBusy(false);
      setError("All Join settings fields must have a value.");
      return;
    }

    try {
      const { error: saveError } = await supabase
        .from("join_content_settings")
        .upsert(payload, { onConflict: "key" });

      if (saveError) throw saveError;

      setStatus("Join settings saved.");
      await loadContent();
    } catch (saveError) {
      setError(toUserFriendlyJoinError(saveError, "Unable to save Join settings."));
    } finally {
      setSettingsBusy(false);
    }
  };

  const startEditingSchedule = (row) => {
    setEditingScheduleId(row.id);
    setScheduleForm({
      label: normalizeText(row.label),
      detail: normalizeText(row.detail),
      display_order: Number(row.display_order || 0),
    });
    setError("");
    setStatus("");
  };

  const handleSaveSchedule = async (event) => {
    event.preventDefault();
    setScheduleBusy(true);
    setError("");
    setStatus("");

    const payload = {
      label: normalizeText(scheduleForm.label),
      detail: normalizeText(scheduleForm.detail),
      display_order: Number(scheduleForm.display_order || getDefaultDisplayOrder(scheduleRows)),
    };

    if (!payload.label || !payload.detail) {
      setScheduleBusy(false);
      setError("Schedule label and detail are required.");
      return;
    }

    try {
      let writeError;
      if (editingScheduleId) {
        ({ error: writeError } = await supabase
          .from("join_content_schedule")
          .update(payload)
          .eq("id", editingScheduleId));
      } else {
        ({ error: writeError } = await supabase.from("join_content_schedule").insert(payload));
      }

      if (writeError) throw writeError;

      setStatus(editingScheduleId ? "Schedule row updated." : "Schedule row added.");
      await loadContent();
      resetScheduleForm();
    } catch (saveError) {
      setError(toUserFriendlyJoinError(saveError, "Unable to save this schedule row."));
    } finally {
      setScheduleBusy(false);
    }
  };

  const handleDeleteSchedule = async (row) => {
    if (!window.confirm(`Delete schedule row "${row.label}"?`)) return;

    setScheduleBusy(true);
    setError("");
    setStatus("");

    try {
      const { error: deleteError } = await supabase.from("join_content_schedule").delete().eq("id", row.id);
      if (deleteError) throw deleteError;

      if (editingScheduleId === row.id) {
        resetScheduleForm();
      }

      setStatus("Schedule row removed.");
      await loadContent();
    } catch (deleteError) {
      setError(toUserFriendlyJoinError(deleteError, "Unable to remove this schedule row."));
    } finally {
      setScheduleBusy(false);
    }
  };

  const startEditingFaq = (row) => {
    setEditingFaqId(row.id);
    setFaqForm({
      question: normalizeText(row.question),
      answer: normalizeText(row.answer),
      display_order: Number(row.display_order || 0),
      is_active: Boolean(row.is_active),
    });
    setError("");
    setStatus("");
  };

  const handleSaveFaq = async (event) => {
    event.preventDefault();
    setFaqBusy(true);
    setError("");
    setStatus("");

    const payload = {
      question: normalizeText(faqForm.question),
      answer: normalizeText(faqForm.answer),
      display_order: Number(faqForm.display_order || getDefaultDisplayOrder(faqRows)),
      is_active: Boolean(faqForm.is_active),
    };

    if (!payload.question || !payload.answer) {
      setFaqBusy(false);
      setError("FAQ question and answer are required.");
      return;
    }

    try {
      let writeError;
      if (editingFaqId) {
        ({ error: writeError } = await supabase.from("join_content_faq").update(payload).eq("id", editingFaqId));
      } else {
        ({ error: writeError } = await supabase.from("join_content_faq").insert(payload));
      }

      if (writeError) throw writeError;

      setStatus(editingFaqId ? "FAQ updated." : "FAQ added.");
      await loadContent();
      resetFaqForm();
    } catch (saveError) {
      setError(toUserFriendlyJoinError(saveError, "Unable to save this FAQ."));
    } finally {
      setFaqBusy(false);
    }
  };

  const handleDeleteFaq = async (row) => {
    if (!window.confirm(`Delete FAQ "${row.question}"?`)) return;

    setFaqBusy(true);
    setError("");
    setStatus("");

    try {
      const { error: deleteError } = await supabase.from("join_content_faq").delete().eq("id", row.id);
      if (deleteError) throw deleteError;

      if (editingFaqId === row.id) {
        resetFaqForm();
      }

      setStatus("FAQ removed.");
      await loadContent();
    } catch (deleteError) {
      setError(toUserFriendlyJoinError(deleteError, "Unable to remove this FAQ."));
    } finally {
      setFaqBusy(false);
    }
  };

  useEffect(() => {
    if (!loading && !editingScheduleId && !scheduleForm.display_order) {
      setScheduleForm((prev) => ({
        ...prev,
        display_order: getDefaultDisplayOrder(scheduleRows),
      }));
    }
  }, [loading, editingScheduleId, scheduleForm.display_order, scheduleRows]);

  useEffect(() => {
    if (!loading && !editingFaqId && !faqForm.display_order) {
      setFaqForm((prev) => ({
        ...prev,
        display_order: getDefaultDisplayOrder(faqRows),
      }));
    }
  }, [loading, editingFaqId, faqForm.display_order, faqRows]);

  return (
    <>
      <h3 className="text-xl font-semibold text-jmuGold">Join Editor</h3>
      <p className="mt-1 text-sm text-jmuLightGold/90">
        Manage Join page text content, schedule entries, and FAQs. Media images stay in the Media
        editor.
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
        <p className="mt-4 text-sm">Loading join editor...</p>
      ) : (
        <div className="mt-4 space-y-4">
          <section className="rounded border border-jmuDarkGold/70 bg-jmuPurple/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="font-semibold text-jmuGold">Join Settings</h4>
              <button
                type="button"
                disabled={settingsBusy}
                onClick={handleSaveSettings}
                className="rounded bg-jmuGold px-3 py-1 text-sm font-semibold text-jmuPurple transition hover:bg-jmuLightGold disabled:cursor-not-allowed disabled:opacity-70"
              >
                {settingsBusy ? "Saving..." : "Save settings"}
              </button>
            </div>

            <form className="mt-4 grid gap-3" onSubmit={handleSaveSettings}>
              {sortedSettings.map((row) => {
                const key = row.key;
                const label = SETTING_LABELS[key] || key;
                const helperText = row.description || SETTING_DESCRIPTIONS[key] || "";
                const value = settingsDrafts[key] ?? "";
                const useTextarea = MULTILINE_SETTING_KEYS.has(key) || value.length > 90;

                return (
                  <label key={key} className="grid gap-1">
                    <span className="text-xs uppercase tracking-wide">{label}</span>
                    {useTextarea ? (
                      <textarea
                        rows="3"
                        value={value}
                        onChange={(event) =>
                          setSettingsDrafts((prev) => ({ ...prev, [key]: event.target.value }))
                        }
                        className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                      />
                    ) : (
                      <input
                        value={value}
                        onChange={(event) =>
                          setSettingsDrafts((prev) => ({ ...prev, [key]: event.target.value }))
                        }
                        className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                      />
                    )}
                    {helperText && <span className="text-xs text-jmuLightGold/80">{helperText}</span>}
                  </label>
                );
              })}
            </form>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded border border-jmuDarkGold/70 bg-jmuPurple/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="font-semibold text-jmuGold">Practice &amp; Season Rows</h4>
                <button
                  type="button"
                  disabled={scheduleBusy}
                  onClick={resetScheduleForm}
                  className="rounded border border-jmuLightGold px-3 py-1 text-xs hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
                >
                  New row
                </button>
              </div>

              {sortedScheduleRows.length === 0 ? (
                <p className="mt-3 text-sm">No schedule rows yet.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {sortedScheduleRows.map((row) => (
                    <li
                      key={row.id}
                      className={`rounded border px-3 py-2 ${
                        editingScheduleId === row.id
                          ? "border-jmuGold bg-jmuGold/15"
                          : "border-jmuDarkGold/70 bg-jmuPurple/30"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{normalizeText(row.label) || "Untitled row"}</p>
                          <p className="text-xs text-jmuLightGold/85">{normalizeText(row.detail)}</p>
                          <p className="text-xs text-jmuLightGold/75">
                            Display order: {Number(row.display_order || 0)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={scheduleBusy}
                            onClick={() => startEditingSchedule(row)}
                            className="rounded border border-jmuLightGold px-2 py-1 text-xs hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={scheduleBusy}
                            onClick={() => handleDeleteSchedule(row)}
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

              <form className="mt-4 grid gap-3 border-t border-jmuDarkGold/70 pt-4" onSubmit={handleSaveSchedule}>
                <h5 className="font-semibold text-jmuGold">
                  {editingScheduleId ? "Edit Schedule Row" : "Add Schedule Row"}
                </h5>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide">Label</span>
                  <input
                    required
                    value={scheduleForm.label}
                    onChange={(event) =>
                      setScheduleForm((prev) => ({ ...prev, label: event.target.value }))
                    }
                    placeholder="Practice"
                    className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide">Detail</span>
                  <textarea
                    required
                    rows="3"
                    value={scheduleForm.detail}
                    onChange={(event) =>
                      setScheduleForm((prev) => ({ ...prev, detail: event.target.value }))
                    }
                    placeholder="Tuesday and Thursday, 5:30 PM - 7:00 PM"
                    className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide">Display Order</span>
                  <input
                    type="number"
                    step="1"
                    value={scheduleForm.display_order}
                    onChange={(event) =>
                      setScheduleForm((prev) => ({ ...prev, display_order: event.target.value }))
                    }
                    className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                  />
                </label>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {editingScheduleId && (
                    <button
                      type="button"
                      disabled={scheduleBusy}
                      onClick={resetScheduleForm}
                      className="rounded border border-jmuLightGold px-4 py-2 text-sm hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Cancel edit
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={scheduleBusy}
                    className="rounded bg-jmuGold px-4 py-2 text-sm font-semibold text-jmuPurple transition hover:bg-jmuLightGold disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {scheduleBusy ? "Saving..." : editingScheduleId ? "Save row" : "Add row"}
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded border border-jmuDarkGold/70 bg-jmuPurple/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="font-semibold text-jmuGold">Join FAQs</h4>
                <button
                  type="button"
                  disabled={faqBusy}
                  onClick={resetFaqForm}
                  className="rounded border border-jmuLightGold px-3 py-1 text-xs hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
                >
                  New FAQ
                </button>
              </div>

              {sortedFaqRows.length === 0 ? (
                <p className="mt-3 text-sm">No FAQs yet.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {sortedFaqRows.map((row) => (
                    <li
                      key={row.id}
                      className={`rounded border px-3 py-2 ${
                        editingFaqId === row.id
                          ? "border-jmuGold bg-jmuGold/15"
                          : "border-jmuDarkGold/70 bg-jmuPurple/30"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{normalizeText(row.question) || "Untitled FAQ"}</p>
                          <p className="text-xs text-jmuLightGold/85">{normalizeText(row.answer)}</p>
                          <p className="text-xs text-jmuLightGold/75">
                            Order: {Number(row.display_order || 0)} -{" "}
                            {row.is_active ? "Active" : "Hidden"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={faqBusy}
                            onClick={() => startEditingFaq(row)}
                            className="rounded border border-jmuLightGold px-2 py-1 text-xs hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={faqBusy}
                            onClick={() => handleDeleteFaq(row)}
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

              <form className="mt-4 grid gap-3 border-t border-jmuDarkGold/70 pt-4" onSubmit={handleSaveFaq}>
                <h5 className="font-semibold text-jmuGold">{editingFaqId ? "Edit FAQ" : "Add FAQ"}</h5>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide">Question</span>
                  <input
                    required
                    value={faqForm.question}
                    onChange={(event) => setFaqForm((prev) => ({ ...prev, question: event.target.value }))}
                    placeholder="Do I need experience?"
                    className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide">Answer</span>
                  <textarea
                    required
                    rows="4"
                    value={faqForm.answer}
                    onChange={(event) => setFaqForm((prev) => ({ ...prev, answer: event.target.value }))}
                    placeholder="No experience is required..."
                    className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide">Display Order</span>
                  <input
                    type="number"
                    step="1"
                    value={faqForm.display_order}
                    onChange={(event) => setFaqForm((prev) => ({ ...prev, display_order: event.target.value }))}
                    className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                  />
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={faqForm.is_active}
                    onChange={(event) => setFaqForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                  />
                  Show this FAQ publicly
                </label>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {editingFaqId && (
                    <button
                      type="button"
                      disabled={faqBusy}
                      onClick={resetFaqForm}
                      className="rounded border border-jmuLightGold px-4 py-2 text-sm hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Cancel edit
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={faqBusy}
                    className="rounded bg-jmuGold px-4 py-2 text-sm font-semibold text-jmuPurple transition hover:bg-jmuLightGold disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {faqBusy ? "Saving..." : editingFaqId ? "Save FAQ" : "Add FAQ"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
