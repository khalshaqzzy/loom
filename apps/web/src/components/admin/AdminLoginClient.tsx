"use client";

import { LockKey } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { Button, Field, InlineAlert, Panel } from "../ui";

export function AdminLoginClient() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.login({ username, password });
      router.replace("/admin");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel className="p-7 md:p-9">
      <div className="mb-8">
        <LockKey size={34} weight="bold" className="text-command" />
        <h1 className="mt-5 text-3xl font-black text-slate-950">Admin sign in</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Secure access to the LOOM operations console.</p>
      </div>
      <form className="grid gap-5" onSubmit={submit}>
        <Field label="Username" value={username} onChange={(event) => setUsername(event.target.value)} required />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
        <Button type="submit" disabled={loading || !username || !password}>
          {loading ? "Signing in" : "Sign in"}
        </Button>
      </form>
    </Panel>
  );
}
