"use client";

import type { MeshMessageResponse } from "@loom/contracts";
import { ClockCounterClockwise, MagnifyingGlass, MapPin, ShieldCheck } from "@phosphor-icons/react";
import { useState } from "react";
import { api } from "@/lib/api";
import { formatJakartaTime, messageLabel } from "@/lib/labels";
import { Badge, Button, EmptyState, Field, InlineAlert, Panel } from "./ui";

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
    <Panel className={compact ? "p-5" : "p-7 md:p-8"}>
      <form className="grid gap-5" onSubmit={submit}>
        <div>
          <div className="flex items-center gap-3">
            {!compact && (
              <div className="grid size-11 place-items-center rounded-xl bg-command/10 text-command">
                <ClockCounterClockwise size={22} weight="bold" />
              </div>
            )}
            <div>
              <h1
                className={
                  compact
                    ? "text-lg font-black tracking-tight text-slate-950"
                    : "text-2xl font-black tracking-tight text-slate-950"
                }
              >
                Privacy lookup
              </h1>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Enter the owner&apos;s full name and birth date. Failed attempts return one generic
                response.
              </p>
            </div>
          </div>
        </div>
        <Field
          label="Owner full name"
          value={ownerFullName}
          onChange={(event) => setOwnerFullName(event.target.value)}
          autoComplete="off"
          placeholder="e.g. Budi Santoso"
          required
        />
        <Field
          label="Owner birth date"
          type="date"
          value={ownerBirthDate}
          onChange={(event) => setOwnerBirthDate(event.target.value)}
          required
        />
        <Button
          type="submit"
          loading={loading}
          disabled={ownerFullName.trim().length < 2 || !ownerBirthDate}
        >
          <MagnifyingGlass size={17} weight="bold" />
          Search history
        </Button>
        {failure ? <InlineAlert tone="error">{failure}</InlineAlert> : null}
      </form>

      {messages !== null && (
        <div className="mt-6 animate-fade-up">
          {messages.length > 0 ? (
            <div className="grid gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {messages.length} message{messages.length !== 1 ? "s" : ""} found
              </p>
              {messages.map((message, index) => (
                <div
                  key={message.messageId}
                  className="stagger-item rounded-lg border border-slate-100 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50"
                  style={{ "--stagger-index": index } as React.CSSProperties}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Badge tone={message.message === "fine" ? "safe" : "command"} dot>
                      {messageLabel(message.message)}
                    </Badge>
                    <span className="flex items-center gap-1.5 font-mono text-xs text-slate-400">
                      <MapPin size={12} weight="bold" />
                      Node {message.senderNodeId}
                    </span>
                  </div>
                  <p className="mt-2.5 text-sm text-slate-600">
                    {formatJakartaTime(message.timestamp)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ShieldCheck}
              title="No messages yet"
              description="No messages have reached the network for this owner yet."
            />
          )}
        </div>
      )}
    </Panel>
  );
}
