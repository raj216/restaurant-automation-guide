// Sign in, forgot password, and the "no access" message.

import { useState, type FormEvent } from "react";
import { useDashboard } from "../DashboardContext";
import { Button } from "../ui";
import { LogoMark } from "../Shell";

export default function SignIn() {
  const d = useDashboard();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError("Enter your email.");
    setBusy(true);
    if (forgot) {
      const problem = await d.resetPassword(email);
      setBusy(false);
      if (problem) setError(problem);
      else setSent(true);
      return;
    }
    if (!password) {
      setBusy(false);
      return setError("Enter your password.");
    }
    const problem = await d.signIn(email, password);
    setBusy(false);
    if (problem) setError(problem);
  };

  return (
    <div className={`cd${d.theme === "dark" ? " d-dark" : ""}`} style={{ alignItems: "center", justifyContent: "center", padding: 16 }}>
      <form className="d-dialog" onSubmit={submit} style={{ width: "min(420px,100%)", padding: 28 }} noValidate>
        <div className="d-row" style={{ gap: 12 }}>
          <LogoMark size={44} />
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>CoHost AI</h1>
            <p className="d-small d-muted">Manager dashboard</p>
          </div>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>{forgot ? "Reset your password" : "Sign in"}</h2>
        {sent ? (
          <div className="d-ok" role="status">
            If that email has an account, a reset link is on its way. Check your inbox.
          </div>
        ) : (
          <>
            <div>
              <label className="d-label" htmlFor="si-email">
                Email
              </label>
              <input id="si-email" type="email" autoComplete="username" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            {!forgot ? (
              <div>
                <label className="d-label" htmlFor="si-pass">
                  Password
                </label>
                <input id="si-pass" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            ) : null}
            {error ? (
              <div className="d-error" role="alert">
                {error}
              </div>
            ) : null}
            <Button kind="primary" size="lg" block type="submit" disabled={busy}>
              {busy ? "One moment…" : forgot ? "Send reset link" : "Sign in"}
            </Button>
          </>
        )}
        <button
          type="button"
          className="d-link"
          onClick={() => {
            setForgot(f => !f);
            setError(null);
            setSent(false);
          }}
        >
          {forgot ? "Back to sign in" : "Forgot your password?"}
        </button>
      </form>
    </div>
  );
}

/** Signed in, but the account isn't linked to a restaurant yet. */
export function NoAccess() {
  const d = useDashboard();
  return (
    <div className={`cd${d.theme === "dark" ? " d-dark" : ""}`} style={{ alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="d-dialog" style={{ width: "min(460px,100%)", padding: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>No restaurant is linked to this account</h2>
        <p className="d-muted">
          You're signed in as {d.user?.email}, but this account hasn't been given access to a restaurant yet. Ask CoHost AI to add you as an owner or staff member.
        </p>
        <Button kind="secondary" onClick={() => void d.signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
