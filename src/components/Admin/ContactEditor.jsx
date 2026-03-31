import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const EMPTY_FORM = {
  label: "",
  value: "",
  contact_type: "email",
  cta_label: "",
  display_order: 0,
  is_active: true,
};

const CONTACT_TYPE_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
  { value: "phone", label: "Phone" },
  { value: "text", label: "Text only" },
];

const normalizeText = (value) => String(value || "").trim();
const normalizeContactType = (value) => normalizeText(value).toLowerCase() || "email";

const toUserFriendlyContactError = (error, fallbackMessage) => {
  const rawMessage = error?.message || fallbackMessage;
  const isRlsError = /row-level security|violates row-level security|permission denied/i.test(
    String(rawMessage)
  );

  if (!isRlsError) return rawMessage;
  return `${fallbackMessage} Supabase blocked this write with RLS. Run docs/supabase_contact_admin_rls.sql and confirm this user is in public.admins.`;
};

export default function ContactEditor() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [formState, setFormState] = useState(EMPTY_FORM);

  const sortedRows = useMemo(
    () =>
      rows
        .slice()
        .sort((a, b) => {
          const orderCompare = Number(a.display_order || 0) - Number(b.display_order || 0);
          if (orderCompare !== 0) return orderCompare;
          return Number(a.id) - Number(b.id);
        }),
    [rows]
  );

  const loadRows = async () => {
    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("contact_cards")
      .select("id, label, value, contact_type, cta_label, display_order, is_active")
      .order("display_order", { ascending: true })
      .order("id", { ascending: true });

    if (loadError) {
      setError(loadError.message || "Unable to load contact cards.");
      setLoading(false);
      return;
    }

    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadRows();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setFormState(EMPTY_FORM);
    setError("");
    setStatus("");
  };

  const startEditing = (row) => {
    setEditingId(row.id);
    setError("");
    setStatus("");
    setFormState({
      label: normalizeText(row.label),
      value: normalizeText(row.value),
      contact_type: normalizeContactType(row.contact_type),
      cta_label: normalizeText(row.cta_label),
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

  const handleSave = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");

    const payload = {
      label: normalizeText(formState.label),
      value: normalizeText(formState.value),
      contact_type: normalizeContactType(formState.contact_type),
      cta_label: normalizeText(formState.cta_label) || null,
      display_order: Number(formState.display_order || 0),
      is_active: Boolean(formState.is_active),
    };

    if (!payload.label || !payload.value) {
      setBusy(false);
      setError("Card label and value are required.");
      return;
    }

    try {
      let writeError;
      if (editingId) {
        ({ error: writeError } = await supabase.from("contact_cards").update(payload).eq("id", editingId));
      } else {
        ({ error: writeError } = await supabase.from("contact_cards").insert(payload));
      }

      if (writeError) throw writeError;

      setStatus(editingId ? "Contact card updated." : "Contact card added.");
      setEditingId(null);
      setFormState(EMPTY_FORM);
      await loadRows();
    } catch (saveError) {
      setError(toUserFriendlyContactError(saveError, "Unable to save this contact card."));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete contact card "${row.label}"?`)) return;

    setBusy(true);
    setError("");
    setStatus("");

    try {
      const { error: deleteError } = await supabase.from("contact_cards").delete().eq("id", row.id);
      if (deleteError) throw deleteError;

      if (editingId === row.id) {
        setEditingId(null);
        setFormState(EMPTY_FORM);
      }

      setStatus("Contact card removed.");
      await loadRows();
    } catch (deleteError) {
      setError(toUserFriendlyContactError(deleteError, "Unable to remove this contact card."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h3 className="text-xl font-semibold text-jmuGold">Contact Editor</h3>
      <p className="mt-1 text-sm text-jmuLightGold/90">
        Add, edit, and remove cards shown on the public Contact page.
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
        <p className="mt-4 text-sm">Loading contact editor...</p>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr,1fr]">
          <div className="rounded border border-jmuDarkGold/70 bg-jmuPurple/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-semibold text-jmuGold">Current Contact Cards</h4>
              <button
                type="button"
                disabled={busy}
                onClick={resetForm}
                className="rounded border border-jmuLightGold px-3 py-1 text-xs hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
              >
                New card
              </button>
            </div>

            {sortedRows.length === 0 ? (
              <p className="mt-3 text-sm">No contact cards yet.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {sortedRows.map((row) => (
                  <li
                    key={row.id}
                    className={`rounded border px-3 py-2 ${
                      editingId === row.id
                        ? "border-jmuGold bg-jmuGold/15"
                        : "border-jmuDarkGold/70 bg-jmuPurple/30"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{normalizeText(row.label) || `Card #${row.id}`}</p>
                        <p className="text-xs text-jmuLightGold/85">
                          {normalizeText(row.contact_type) || "text"} - {normalizeText(row.value)}
                        </p>
                        <p className="text-xs text-jmuLightGold/75">
                          Order: {Number(row.display_order || 0)} -{" "}
                          {row.is_active ? "Active" : "Hidden"}
                        </p>
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
                ))}
              </ul>
            )}
          </div>

          <div className="rounded border border-jmuDarkGold/70 bg-jmuPurple/40 p-4">
            <h4 className="font-semibold text-jmuGold">
              {editingId ? `Edit Card #${editingId}` : "Add Contact Card"}
            </h4>
            <p className="mt-1 text-xs text-jmuLightGold/80">
              Use Email for mailto links, URL for external links, Phone for tel links, and Text only
              for copy-only content.
            </p>

            <form className="mt-4 grid gap-3" onSubmit={handleSave}>
              <label className="grid gap-1">
                <span className="text-xs uppercase tracking-wide">Card Label</span>
                <input
                  required
                  name="label"
                  value={formState.label}
                  onChange={handleFormChange}
                  placeholder="Club President"
                  className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs uppercase tracking-wide">Value</span>
                <input
                  required
                  name="value"
                  value={formState.value}
                  onChange={handleFormChange}
                  placeholder="madisonrugbypresident@gmail.com"
                  className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs uppercase tracking-wide">Type</span>
                <select
                  name="contact_type"
                  value={formState.contact_type}
                  onChange={handleFormChange}
                  className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-sm"
                >
                  {CONTACT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs uppercase tracking-wide">Action Button Label (optional)</span>
                <input
                  name="cta_label"
                  value={formState.cta_label}
                  onChange={handleFormChange}
                  placeholder="Visit @jmumensrugby"
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
                Show this card publicly
              </label>

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
                  {busy ? "Saving..." : editingId ? "Save card" : "Add card"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
