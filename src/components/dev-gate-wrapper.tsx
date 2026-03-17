"use client";

import { useEffect, useState } from "react";

const GATE_USERNAME = "Eventyr2024#";
const GATE_PASSWORD = "M3zj2";

function GateOverlay({
  onAuthenticated,
}: {
  onAuthenticated: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/dev-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.ok) {
        onAuthenticated();
      } else {
        setError(data.error || "Invalid credentials");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-neutral-700 bg-neutral-900 p-8 shadow-xl">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-white">
              Development Access
            </h1>
            <p className="mt-2 text-sm text-neutral-400">
              Enter credentials to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-neutral-400">
                Username
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-2 w-full rounded-xl border border-neutral-600 bg-neutral-800 px-4 py-3 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                placeholder="Username"
                required
                autoComplete="username"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-neutral-400">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-neutral-600 bg-neutral-800 px-4 py-3 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                placeholder="Password"
                required
                autoComplete="current-password"
              />
            </label>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-neutral-950 hover:bg-neutral-100 disabled:opacity-60"
            >
              {loading ? "Checking…" : "Enter"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-neutral-500">
          Eventyr Performance • Development
        </p>
      </div>
    </div>
  );
}

export default function DevGateWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showGate, setShowGate] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const host = window.location.hostname;
    const isEventyr =
      host === "eventyrperformance.com" || host === "www.eventyrperformance.com";

    if (!isEventyr) {
      setShowGate(false);
      return;
    }

    async function check() {
      try {
        const res = await fetch("/api/dev-gate/verify", {
          credentials: "include",
        });
        const data = await res.json();
        setShowGate(!data.authenticated);
      } catch {
        setShowGate(true);
      }
    }

    check();
  }, []);

  if (showGate === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="text-sm text-neutral-500">Loading…</div>
      </div>
    );
  }

  if (showGate) {
    return <GateOverlay onAuthenticated={() => setShowGate(false)} />;
  }

  return <>{children}</>;
}
