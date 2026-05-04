"use client";

import type { MeshMessageResponse } from "@loom/contracts";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useState } from "react";
import { api } from "@/lib/api";
import { formatJakartaTime, messageLabel } from "@/lib/labels";
import { Button, Field, InlineAlert, Panel } from "./ui";

export function PublicHistoryLookup({ compact = false }: { compact?: boolean }) {
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerBirthDate, setOwnerBirthDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");
  const [messages, setMessages] = useState<MeshMessageResponse[] | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setFailure("");
    try {
      const response = await api.publicLookup({ ownerFullName, ownerBirthDate });
      if (response.ok) {
        setMessages(response.messages);
      } else {
        setMessages(null);
        setFailure(response.message || "No matching history could be returned.");
      }
    } catch {
      setMessages(null);
      setFailure("No matching history could be returned.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel className={compact ? "p-5" : "p-6 md:p-8"}>
      <form className="grid gap-5" onSubmit={submit}>
        <div>
          <h1 className={compact ? "text-xl font-black text-slate-950" : "text-3xl font-black text-slate-950"}>
            Privacy lookup
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Enter the owner's full name and birth date. Failed attempts return one generic response.
          </p>
        </div>
        <Field
          label="Owner full name"
          value={ownerFullName}
          onChange={(event) => setOwnerFullName(event.target.value)}
          autoComplete="off"
          required
        />
        <Field
          label="Owner birth date"
          type="date"
          value={ownerBirthDate}
          onChange={(event) => setOwnerBirthDate(event.target.value)}
          required
        />
        <Button type="submit" disabled={loading || ownerFullName.trim().length < 2 || !ownerBirthDate}>
          <MagnifyingGlass size={18} weight="bold" />
          {loading ? "Searching" : "Search history"}
        </Button>
        {failure ? <InlineAlert tone="error">{failure}</InlineAlert> : null}
      </form>
      {messages ? (
        <div className="mt-6 grid gap-3">
          {messages.length ? (
            messages.map((message) => (
              <div key={message.messageId} className="rounded-lg border border-border bg-mist p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong>{messageLabel(message.message)}</strong>
                  <span className="font-mono text-xs text-slate-500">Node {message.senderNodeId}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{formatJakartaTime(message.timestamp)}</p>
              </div>
            ))
          ) : (
            <InlineAlert tone="success">No messages have reached the network for this owner yet.</InlineAlert>
          )}
        </div>
      ) : null}
    </Panel>
  );
}
