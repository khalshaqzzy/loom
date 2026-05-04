"use client";

import { LockKey, Eye, EyeSlash } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { Button, Field, InlineAlert, Panel } from "../ui";

export function AdminLoginClient() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        <div className="grid size-12 place-items-center rounded-2xl bg-command/10 text-command">
          <LockKey size={26} weight="bold" />
        </div>
        <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950">Admin sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Secure access to the LOOM operations console.
        </p>
      </div>
      <form className="grid gap-5" onSubmit={submit}>
        <Field
          label="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          required
        />
        <div className="relative">
          <Field
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="absolute right-3 top-[34px] p-1 text-slate-400 transition-colors hover:text-slate-600"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
          </button>
        </div>
        {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
        <Button type="submit" loading={loading} disabled={!username || !password}>
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-xs text-slate-400">
        Protected access only. Contact your administrator for credentials.
      </p>
    </Panel>
  );
}
