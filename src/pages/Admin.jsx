import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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
        setIsAdmin((adminRows?.length ?? 0) > 0);
      } else {
        setIsAdmin(false);
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
    setIsLoading(false);
  };

  return (
    <section className="w-full max-w-3xl px-6 py-10">
      <div className="rounded-lg border border-jmuDarkGold bg-jmuPurple/70 p-6 shadow-lg">
        <h2 className="text-3xl font-bold text-jmuGold">Admin Portal</h2>
        <p className="mt-2 text-jmuLightGold">
          Sign in with your Supabase account. Access is granted only to users listed in the
          <code className="mx-1 rounded bg-jmuDarkGold/60 px-2 py-0.5 text-jmuGold">admins</code>
          table.
        </p>

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
              ✅ Admin access confirmed. This page is now ready to gate future editing tools (roster,
              media, schedule, and more).
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
      </div>
    </section>
  );
}
