import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import MediaEditor from "../components/Admin/MediaEditor";
import RosterEditor from "../components/Admin/RosterEditor";
import ContactEditor from "../components/Admin/ContactEditor";
import SponsorsEditor from "../components/Admin/SponsorsEditor";
import JoinEditor from "../components/Admin/JoinEditor";
import DonateEditor from "../components/Admin/DonateEditor";
import SiteLinksEditor from "../components/Admin/SiteLinksEditor";
import AdminUsersEditor from "../components/Admin/AdminUsersEditor";
import {
  FaCalendarDays,
  FaEnvelope,
  FaHandshake,
  FaHeart,
  FaImages,
  FaLink,
  FaRightFromBracket,
  FaShieldHalved,
  FaUserGroup,
  FaUserPlus,
} from "react-icons/fa6";

const INITIAL_FORM = {
  season_id: "",
  season_name: "",
  date: "",
  opponent: "",
  side: "A",
  home: true,
  show_result: false,
  result: "",
  notes: "",
};

const ADMIN_EDITORS = [
  { id: "schedule", label: "Schedule editor", icon: FaCalendarDays },
  { id: "roster", label: "Roster editor", icon: FaUserGroup },
  { id: "media", label: "Media editor", icon: FaImages },
  { id: "join", label: "Join editor", icon: FaUserPlus },
  { id: "contact", label: "Contact editor", icon: FaEnvelope },
  { id: "donate", label: "Donate editor", icon: FaHeart },
  { id: "site-links", label: "Site links", icon: FaLink },
  { id: "sponsors", label: "Sponsors editor", icon: FaHandshake },
  { id: "admins", label: "Administrator access", icon: FaShieldHalved },
];

export default function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeEditor, setActiveEditor] = useState(() => {
    const inviteParameters = `${window.location.search}&${window.location.hash}`;
    return inviteParameters.includes("type=invite") ? "admins" : "schedule";
  });
  const [scheduleMatches, setScheduleMatches] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState("all");
  const [formState, setFormState] = useState(INITIAL_FORM);

  const seasonOptions = useMemo(() => {
    const options = Array.from(
      new Map(scheduleMatches.map((match) => [match.season_id, match.season_name])).entries()
    ).map(([season_id, season_name]) => ({ season_id, season_name }));

    return options.sort((a, b) => {
      const [aTerm, aYear] = a.season_id.split("-");
      const [bTerm, bYear] = b.season_id.split("-");
      if (aYear !== bYear) return Number(bYear) - Number(aYear);
      if (aTerm === "fall" && bTerm === "spring") return -1;
      if (aTerm === "spring" && bTerm === "fall") return 1;
      return 0;
    });
  }, [scheduleMatches]);

  const filteredMatches = useMemo(() => {
    const rows =
      selectedSeasonId === "all"
        ? scheduleMatches
        : scheduleMatches.filter((match) => match.season_id === selectedSeasonId);

    return rows.slice().sort((a, b) => {
      const dateCompare = new Date(a.date) - new Date(b.date);
      if (dateCompare !== 0) return dateCompare;
      return String(a.opponent).localeCompare(String(b.opponent));
    });
  }, [scheduleMatches, selectedSeasonId]);

  const resetEditorForm = () => {
    setFormState(INITIAL_FORM);
    setEditingMatchId(null);
  };

  const loadScheduleMatches = async () => {
    setScheduleLoading(true);
    setScheduleError("");

    const { data, error } = await supabase
      .from("matches")
      .select("id, season_name, season_id, date, opponent, side, home, show_result, result, notes")
      .order("date", { ascending: true });

    if (error) {
      setScheduleError(error.message || "Unable to load schedule matches.");
      setScheduleLoading(false);
      return;
    }

    setScheduleMatches(data || []);
    setScheduleLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    const checkAdminStatus = async (nextSession) => {
      if (!nextSession?.user) {
        if (!isMounted) return;
        setIsAdmin(false);
        setIsLoading(false);
        setScheduleMatches([]);
        resetEditorForm();
        return;
      }

      setIsLoading(true);
      const { data, error } = await supabase.rpc("is_admin");

      if (!isMounted) return;

      if (!error) {
        setErrorMessage("");
        setIsAdmin(Boolean(data));

        if (data) {
          await loadScheduleMatches();
        } else {
          setScheduleMatches([]);
          resetEditorForm();
        }

        setIsLoading(false);
        return;
      }

      const { data: adminRows, error: adminError } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", nextSession.user.id)
        .limit(1);

      if (!isMounted) return;

      if (!adminError) {
        setErrorMessage("");
        const hasAdminAccess = (adminRows?.length ?? 0) > 0;
        setIsAdmin(hasAdminAccess);

        if (hasAdminAccess) {
          await loadScheduleMatches();
        } else {
          setScheduleMatches([]);
          resetEditorForm();
        }
      } else {
        setIsAdmin(false);
        setScheduleMatches([]);
        resetEditorForm();
        setErrorMessage(
          "Unable to verify admin access. Please run docs/supabase_admin_auth_fix.sql in Supabase SQL Editor, then try again."
        );
      }

      setIsLoading(false);
    };

    const initializeAuth = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error) {
        setErrorMessage("Unable to load your login session right now.");
        setIsLoading(false);
        return;
      }

      setSession(data.session ?? null);
      await checkAdminStatus(data.session ?? null);
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      checkAdminStatus(nextSession ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMessage(error.message || "Login failed. Please check your credentials.");
      setIsLoading(false);
      return;
    }

    setPassword("");
  };

  const handleLogout = async () => {
    setErrorMessage("");
    setIsLoading(true);
    await supabase.auth.signOut();
    setScheduleMatches([]);
    resetEditorForm();
    setIsLoading(false);
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const startEditingMatch = (match) => {
    setEditingMatchId(match.id);
    setFormState({
      season_id: match.season_id ?? "",
      season_name: match.season_name ?? "",
      date: match.date ?? "",
      opponent: match.opponent ?? "",
      side: match.side ?? "",
      home: Boolean(match.home),
      show_result: Boolean(match.show_result),
      result: match.result ?? "",
      notes: match.notes ?? "",
    });
  };

  const getNextMatchId = async () => {
    const { data, error } = await supabase
      .from("matches")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data?.id ?? 0) + 1;
  };

  const handleSaveMatch = async (event) => {
    event.preventDefault();

    if (!isAdmin) {
      setScheduleError("Only admins can edit the schedule.");
      return;
    }

    setScheduleError("");
    setScheduleLoading(true);

    const payload = {
      season_id: formState.season_id.trim(),
      season_name: formState.season_name.trim(),
      date: formState.date,
      opponent: formState.opponent.trim(),
      side: formState.side.trim(),
      home: formState.home,
      show_result: formState.show_result,
      result: formState.result.trim() || null,
      notes: formState.notes.trim() || null,
    };

    let error;

    if (editingMatchId) {
      ({ error } = await supabase.from("matches").update(payload).eq("id", editingMatchId));
    } else {
      try {
        const nextMatchId = await getNextMatchId();
        ({ error } = await supabase.from("matches").insert({ ...payload, id: nextMatchId }));
      } catch (nextIdError) {
        error = nextIdError;
      }
    }

    if (error) {
      setScheduleError(error.message || "Unable to save this match.");
      setScheduleLoading(false);
      return;
    }

    resetEditorForm();
    await loadScheduleMatches();
  };

  const handleDeleteMatch = async (matchId) => {
    if (!isAdmin) {
      setScheduleError("Only admins can edit the schedule.");
      return;
    }

    setScheduleError("");
    setScheduleLoading(true);

    const { error } = await supabase.from("matches").delete().eq("id", matchId);

    if (error) {
      setScheduleError(error.message || "Unable to delete this match.");
      setScheduleLoading(false);
      return;
    }

    if (editingMatchId === matchId) {
      resetEditorForm();
    }

    await loadScheduleMatches();
  };

  return (
    <section className="admin-page">
      <header className="admin-page-heading">
        <h2>Admin Portal</h2>
        <p>Sign in to manage protected team content.</p>
      </header>

      {errorMessage && <div className="admin-alert admin-alert-error" role="alert">{errorMessage}</div>}

      {!session && !isLoading && (
        <form className="admin-login-card" onSubmit={handleLogin}>
          <label className="admin-field">
            <span>Email</span>
            <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@email.com" />
          </label>
          <label className="admin-field">
            <span>Password</span>
            <input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
          </label>
          <button type="submit" className="admin-button admin-button-primary" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in as admin"}
          </button>
        </form>
      )}

      {isLoading && <p className="admin-loading" role="status">Checking access...</p>}

      {session && !isLoading && !isAdmin && (
        <section className="admin-alert admin-alert-warning">
          <p>You are signed in as <strong>{session.user.email}</strong>, but this account is not in the admins table.</p>
          <button type="button" onClick={handleLogout} className="admin-button admin-button-secondary">Sign out</button>
        </section>
      )}

      {session && !isLoading && isAdmin && (
        <div className="admin-workspace">
          <aside className="admin-sidebar">
            <p className="admin-sidebar-label">Editor</p>
            <nav aria-label="Admin editors">
              {ADMIN_EDITORS.map((editor) => {
                const Icon = editor.icon;
                return (
                  <button
                    key={editor.id}
                    type="button"
                    onClick={() => setActiveEditor(editor.id)}
                    className={`admin-nav-button ${activeEditor === editor.id ? "is-active" : ""}`}
                    aria-current={activeEditor === editor.id ? "page" : undefined}
                  >
                    <Icon aria-hidden="true" />
                    <span>{editor.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="admin-account">
              <p>Welcome, {session.user.email}.</p>
              <p>✅ Admin access confirmed.</p>
              <button type="button" onClick={handleLogout} className="admin-button admin-button-secondary">
                <FaRightFromBracket aria-hidden="true" /> Sign out
              </button>
            </div>
          </aside>

          <main className="admin-content">
            <section className="admin-editor-canvas">
              {activeEditor === "schedule" && (
                <>
                  <header className="admin-editor-heading">
                    <h3>Schedule Editor</h3>
                    <p>Add, edit, and remove schedule entries. Writes are protected by matches table RLS and admin checks.</p>
                  </header>

                  {scheduleError && <div className="admin-alert admin-alert-error" role="alert">{scheduleError}</div>}

                  <form className="admin-schedule-form" onSubmit={handleSaveMatch}>
                    <label className="admin-field"><span>Season ID</span><input name="season_id" required value={formState.season_id} onChange={handleFormChange} placeholder="fall-2026" /></label>
                    <label className="admin-field"><span>Season Name</span><input name="season_name" required value={formState.season_name} onChange={handleFormChange} placeholder="Fall 2026" /></label>
                    <label className="admin-field"><span>Date</span><input type="date" name="date" required value={formState.date} onChange={handleFormChange} /></label>
                    <label className="admin-field"><span>Opponent</span><input name="opponent" required value={formState.opponent} onChange={handleFormChange} /></label>
                    <label className="admin-field"><span>Side</span><input name="side" required value={formState.side} onChange={handleFormChange} placeholder="A" /></label>
                    <label className="admin-field"><span>Result</span><input name="result" value={formState.result} onChange={handleFormChange} placeholder="27-12 W" /></label>
                    <label className="admin-field admin-field-wide"><span>Notes</span><textarea name="notes" value={formState.notes} onChange={handleFormChange} rows="3" /></label>
                    <fieldset className="admin-checkboxes">
                      <label><input type="checkbox" name="home" checked={formState.home} onChange={handleFormChange} /> Home match</label>
                      <label><input type="checkbox" name="show_result" checked={formState.show_result} onChange={handleFormChange} /> Show result publicly</label>
                    </fieldset>
                    <div className="admin-form-actions">
                      {editingMatchId && <button type="button" onClick={resetEditorForm} className="admin-button admin-button-secondary">Cancel edit</button>}
                      <button type="submit" disabled={scheduleLoading} className="admin-button admin-button-primary">
                        {scheduleLoading ? "Saving..." : editingMatchId ? "Save changes" : "Add match"}
                      </button>
                    </div>
                  </form>

                  <section className="admin-records" aria-labelledby="existing-matches-heading">
                    <header>
                      <h4 id="existing-matches-heading">Existing Matches</h4>
                      <label className="admin-field admin-filter"><span>Filter by season</span><select value={selectedSeasonId} onChange={(event) => setSelectedSeasonId(event.target.value)}><option value="all">All seasons</option>{seasonOptions.map((season) => <option key={season.season_id} value={season.season_id}>{season.season_name}</option>)}</select></label>
                    </header>
                    {scheduleLoading ? (
                      <p className="mt-2 text-sm">Loading matches...</p>
                    ) : filteredMatches.length === 0 ? (
                      <p className="mt-2 text-sm">No matches found for this season.</p>
                    ) : (
                      <ul className="admin-match-list">
                        {filteredMatches.map((match) => (
                          <li key={match.id} className="admin-match-row">
                            <span>{match.date} · {match.season_name} · {match.side} vs {match.opponent} ({match.home ? "Home" : "Away"})</span>
                            <div>
                              <button type="button" onClick={() => startEditingMatch(match)} className="admin-button admin-button-small admin-button-secondary">Edit</button>
                              <button type="button" onClick={() => handleDeleteMatch(match.id)} className="admin-button admin-button-small admin-button-danger">Remove</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              )}
              {activeEditor === "roster" && <RosterEditor />}
              {activeEditor === "media" && <MediaEditor />}
              {activeEditor === "join" && <JoinEditor />}
              {activeEditor === "contact" && <ContactEditor />}
              {activeEditor === "donate" && <DonateEditor />}
              {activeEditor === "site-links" && <SiteLinksEditor />}
              {activeEditor === "sponsors" && <SponsorsEditor />}
              {activeEditor === "admins" && <AdminUsersEditor currentUserId={session.user.id} />}
            </section>
          </main>
        </div>
      )}
    </section>
  );
}
