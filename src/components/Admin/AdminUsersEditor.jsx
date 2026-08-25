import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const MIN_ADMIN_PASSWORD_LENGTH = 16;

function formatDate(value) {
  if (!value) return "Not yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

async function getFunctionErrorMessage(error, fallbackMessage) {
  const response = error?.context;
  if (response instanceof Response) {
    try {
      const body = await response.clone().json();
      if (typeof body?.error === "string") {
        return body.requestId ? `${body.error} Reference: ${body.requestId}` : body.error;
      }
      if (typeof body?.message === "string") return body.message;
    } catch {
      // Fall back to the stable client message when the response is not JSON.
    }
  }

  return error?.message || fallbackMessage;
}

export default function AdminUsersEditor({ currentUserId }) {
  const [admins, setAdmins] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadAdmins = async () => {
    setLoading(true);
    setError("");

    const { data, error: functionError } = await supabase.functions.invoke("admin-users", {
      body: { action: "list" },
    });

    if (functionError) {
      setError(await getFunctionErrorMessage(functionError, "Unable to load administrators."));
      setLoading(false);
      return;
    }

    setAdmins(Array.isArray(data?.admins) ? data.admins : []);
    setLoading(false);
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleInvite = async (event) => {
    event.preventDefault();
    setBusyAction("invite");
    setError("");
    setMessage("");

    const { data, error: functionError } = await supabase.functions.invoke("admin-users", {
      body: { action: "invite", email: inviteEmail },
    });

    if (functionError) {
      setError(await getFunctionErrorMessage(functionError, "Unable to invite this administrator."));
      setBusyAction("");
      return;
    }

    setInviteEmail("");
    setMessage(data?.message || "Administrator access updated.");
    setBusyAction("");
    await loadAdmins();
  };

  const handleRemove = async (admin) => {
    if (admin.userId === currentUserId || admins.length <= 1) return;

    const confirmed = window.confirm(
      `Remove administrator access for ${admin.email}? Their Supabase Auth account will be retained.`,
    );
    if (!confirmed) return;

    setBusyAction(`remove:${admin.userId}`);
    setError("");
    setMessage("");

    const { data, error: functionError } = await supabase.functions.invoke("admin-users", {
      body: { action: "remove", userId: admin.userId },
    });

    if (functionError) {
      setError(await getFunctionErrorMessage(functionError, "Unable to remove administrator access."));
      setBusyAction("");
      return;
    }

    setMessage(data?.message || "Administrator access removed.");
    setBusyAction("");
    await loadAdmins();
  };

  const handlePasswordUpdate = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_ADMIN_PASSWORD_LENGTH} characters for administrator passwords.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("The password confirmation does not match.");
      return;
    }

    setBusyAction("password");
    const { error: passwordError } = await supabase.auth.updateUser({ password });

    if (passwordError) {
      setError(passwordError.message || "Unable to update your password.");
      setBusyAction("");
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setMessage("Your administrator password was updated.");
    setBusyAction("");

    if (window.location.hash || window.location.search.includes("type=invite")) {
      window.history.replaceState({}, document.title, "/admin");
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold text-jmuGold">Administrator Access</h3>
      <p className="mt-1 text-sm text-jmuLightGold/90">
        Marketing Chairs own this list. Invite an incoming chair before removing an outgoing one.
      </p>

      {error && (
        <div role="alert" className="mt-4 rounded border border-red-300 bg-red-100/10 px-4 py-3 text-red-200">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="mt-4 rounded border border-green-300 bg-green-100/10 px-4 py-3 text-green-100">
          {message}
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <form className="rounded border border-jmuDarkGold/70 bg-jmuPurple/40 p-4" onSubmit={handleInvite}>
          <h4 className="font-semibold text-jmuGold">Invite a new administrator</h4>
          <p className="mt-1 text-sm text-jmuLightGold/80">
            Supabase sends a one-time invite. Ask the recipient to accept it and set a unique password of at least 16 characters.
          </p>
          <label className="mt-4 grid gap-1">
            <span className="text-xs uppercase tracking-wide">New administrator email</span>
            <input
              type="email"
              required
              maxLength="254"
              autoComplete="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2"
              placeholder="marketing-chair@jmu.edu"
            />
          </label>
          <button
            type="submit"
            disabled={Boolean(busyAction)}
            className="mt-3 rounded bg-jmuGold px-4 py-2 font-semibold text-jmuPurple transition hover:bg-jmuLightGold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {busyAction === "invite" ? "Sending invite..." : "Invite administrator"}
          </button>
        </form>

        <form className="rounded border border-jmuDarkGold/70 bg-jmuPurple/40 p-4" onSubmit={handlePasswordUpdate}>
          <h4 className="font-semibold text-jmuGold">Set or change your password</h4>
          <p className="mt-1 text-sm text-jmuLightGold/80">
            New invitees should do this immediately after opening their invite link.
          </p>
          <label className="mt-4 grid gap-1">
            <span className="text-xs uppercase tracking-wide">New password</span>
            <input
              type="password"
              required
              minLength={MIN_ADMIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2"
            />
          </label>
          <label className="mt-3 grid gap-1">
            <span className="text-xs uppercase tracking-wide">Confirm new password</span>
            <input
              type="password"
              required
              minLength={MIN_ADMIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="rounded border border-jmuDarkGold bg-jmuPurple px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={Boolean(busyAction)}
            className="mt-3 rounded border border-jmuLightGold px-4 py-2 font-semibold hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
          >
            {busyAction === "password" ? "Updating password..." : "Update my password"}
          </button>
        </form>
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-semibold text-jmuGold">Current administrators</h4>
          <button
            type="button"
            onClick={loadAdmins}
            disabled={loading || Boolean(busyAction)}
            className="rounded border border-jmuLightGold px-3 py-1.5 text-sm hover:bg-jmuLightGold hover:text-jmuPurple disabled:cursor-not-allowed disabled:opacity-70"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="mt-3 text-sm">Loading administrators...</p>
        ) : admins.length === 0 ? (
          <p className="mt-3 text-sm">No administrators were returned.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {admins.map((admin) => {
              const removalDisabled = admin.userId === currentUserId || admins.length <= 1 || Boolean(busyAction);
              return (
                <li
                  key={admin.userId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded border border-jmuDarkGold/70 bg-jmuPurple/50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="break-all font-semibold text-jmuLightGold">
                      {admin.email} {admin.isCurrentUser ? <span className="text-jmuGold">(you)</span> : null}
                    </p>
                    <p className="mt-1 text-xs text-jmuLightGold/75">
                      Added {formatDate(admin.addedAt)} · Last sign-in {formatDate(admin.lastSignInAt)}
                    </p>
                    {!admin.emailConfirmedAt && (
                      <p className="mt-1 text-xs text-yellow-100">Invite pending or email not yet confirmed.</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={removalDisabled}
                    title={admin.userId === currentUserId ? "You cannot remove your own access." : undefined}
                    onClick={() => handleRemove(admin)}
                    className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-100 hover:bg-red-100/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyAction === `remove:${admin.userId}` ? "Removing..." : "Remove access"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
