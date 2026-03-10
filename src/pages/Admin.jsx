import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [scheduleMatches, setScheduleMatches] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [formState, setFormState] = useState({
    season_id: "",
    season_name: "",
    date: "",
    opponent: "",
    side: "A",
    home: true,
    show_result: false,
    result: "",
    notes: "",
  });

  const loadScheduleMatches = async () => {
    setScheduleLoading(true);
    setScheduleError("");

    const { data, error } = await supabase
      .from("matches")
      .select("id, season_name, season_id, date, opponent, side, home")
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
        }
        setIsLoading(false);
        return;
      }

      // Fallback check by UID in case the RPC or DB function is misconfigured.
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
        }
      } else {
        setIsAdmin(false);
        setScheduleMatches([]);
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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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
    setIsLoading(false);
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddMatch = async (event) => {
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

    const { error } = await supabase.from("matches").insert(payload);

    if (error) {
      setScheduleError(error.message || "Unable to add this match.");
      setScheduleLoading(false);
      return;
    }

    setFormState({
      season_id: "",
      season_name: "",
      date: "",
      opponent: "",
      side: "A",
      home: true,
      show_result: false,
      result: "",
      notes: "",
    });

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

    await loadScheduleMatches();
  };

  return (
    <section className="w-full max-w-3xl px-6 py-10">
      <div className="rounded-lg border border-jmuDarkGold bg-jmuPurple/70 p-6 shadow-lg">
        <h2 className="text-3xl font-bold text-jmuGold">Admin Portal</h2>
        <p className="mt-2 text-jmuLightGold">Sign in to manage protected team content.</p>

        {errorMessage && (
          <div className="mt-4 rounded border border-red-300 bg-red-100/10 px-4 py-3 text-red-200">
            {errorMessage}
          </div>
        )}

        {!session && !isLoading && (
          <form className="mt-6 grid gap-4" onSubmit={handleLogin}>
            <label className="grid gap-1">
              <span className="text-sm uppercase tracking-wide text-jmuLightGold">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-jmuLightGold focus:border-jmuGold focus:outline-none"
                placeholder="admin@email.com"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm uppercase tracking-wide text-jmuLightGold">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2 text-jmuLightGold focus:border-jmuGold focus:outline-none"
                placeholder="••••••••"
              />
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 rounded bg-jmuGold px-4 py-2 font-semibold text-jmuPurple transition hover:bg-jmuLightGold disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Signing in..." : "Sign in as admin"}
            </button>
          </form>
        )}

        {isLoading && <p className="mt-6 text-jmuLightGold">Checking access...</p>}

        {session && !isLoading && !isAdmin && (
          <div className="mt-6 rounded border border-yellow-300 bg-yellow-100/10 px-4 py-3 text-yellow-100">
            <p>
              You are signed in as <strong>{session.user.email}</strong>, but this account is not in the
              admins table.
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 rounded border border-jmuLightGold px-4 py-2 text-sm font-semibold hover:bg-jmuLightGold hover:text-jmuPurple"
            >
              Sign out
            </button>
          </div>
        )}

        {session && !isLoading && isAdmin && (
          <div className="mt-6 rounded border border-green-300 bg-green-100/10 px-4 py-4 text-green-100">
            <p className="font-semibold">Welcome, {session.user.email}.</p>
            <p className="mt-1">
              ✅ Admin access confirmed. Schedule editing is enabled for authenticated admins.
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 rounded border border-jmuLightGold px-4 py-2 text-sm font-semibold hover:bg-jmuLightGold hover:text-jmuPurple"
            >
              Sign out
            </button>

            <div className="mt-8 rounded border border-jmuLightGold/30 bg-jmuPurple/40 p-4 text-jmuLightGold">
              <h3 className="text-xl font-semibold text-jmuGold">Schedule Editor</h3>
              <p className="mt-1 text-sm text-jmuLightGold/90">
                Add new matches or remove incorrect entries. Server-side Row Level Security should
                enforce that only admins can write to the matches table.
              </p>

              {scheduleError && (
                <div className="mt-4 rounded border border-red-300 bg-red-100/10 px-4 py-3 text-red-200">
                  {scheduleError}
                </div>
              )}

              <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleAddMatch}>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide">Season ID</span>
                  <input
                    name="season_id"
                    required
                    value={formState.season_id}
                    onChange={handleFormChange}
                    placeholder="fall-2026"
                    className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide">Season Name</span>
                  <input
                    name="season_name"
                    required
                    value={formState.season_name}
                    onChange={handleFormChange}
                    placeholder="Fall 2026"
                    className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide">Date</span>
                  <input
                    type="date"
                    name="date"
                    required
                    value={formState.date}
                    onChange={handleFormChange}
                    className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide">Opponent</span>
                  <input
                    name="opponent"
                    required
                    value={formState.opponent}
                    onChange={handleFormChange}
                    className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide">Side</span>
                  <input
                    name="side"
                    required
                    value={formState.side}
                    onChange={handleFormChange}
                    placeholder="A"
                    className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide">Result</span>
                  <input
                    name="result"
                    value={formState.result}
                    onChange={handleFormChange}
                    placeholder="27-12 W"
                    className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 md:col-span-2">
                  <span className="text-xs uppercase tracking-wide">Notes</span>
                  <textarea
                    name="notes"
                    value={formState.notes}
                    onChange={handleFormChange}
                    rows="3"
                    className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2"
                  />
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="home"
                    checked={formState.home}
                    onChange={handleFormChange}
                  />
                  Home match
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="show_result"
                    checked={formState.show_result}
                    onChange={handleFormChange}
                  />
                  Show result publicly
                </label>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={scheduleLoading}
                    className="rounded bg-jmuGold px-4 py-2 font-semibold text-jmuPurple transition hover:bg-jmuLightGold disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {scheduleLoading ? "Saving..." : "Add match"}
                  </button>
                </div>
              </form>

              <div className="mt-6">
                <h4 className="font-semibold text-jmuGold">Existing Matches</h4>
                {scheduleLoading ? (
                  <p className="mt-2 text-sm">Loading matches...</p>
                ) : scheduleMatches.length === 0 ? (
                  <p className="mt-2 text-sm">No matches found.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {scheduleMatches.map((match) => (
                      <li
                        key={match.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border border-jmuDarkGold/70 bg-jmuPurple/50 px-3 py-2"
                      >
                        <span>
                          {match.date} · {match.season_name} · {match.side} vs {match.opponent} (
                          {match.home ? "Home" : "Away"})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteMatch(match.id)}
                          className="rounded border border-red-200 px-2 py-1 text-xs text-red-100 hover:bg-red-100/20"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
