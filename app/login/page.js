"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Incorrect password");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("Something went wrong — try again.");
      setLoading(false);
    }
  };

  return (
    <div className="hp-login-shell">
      <div className="hp-login-card">
        <div className="hp-login-brand">
          <div className="hp-login-mark">HP</div>
          <div className="hp-login-name">Hoff Parquet</div>
        </div>
        <form onSubmit={submit}>
          <div className="hp-field">
            <label>Workspace password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          {error && <div className="hp-login-error">{error}</div>}
          <button
            type="submit"
            className="hp-btn hp-btn-primary"
            disabled={loading || !password}
            style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
