"use client";

import type { MeshMessageResponse, MessageValue } from "@loom/contracts";
import { ListMagnifyingGlass, MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { messageValueOptions } from "@/lib/labels";
import { Button, EmptyState, Field, InlineAlert, Panel, SelectField, Skeleton } from "../ui";
import { MessageTable } from "./MessageTable";

export function AdminMessagesClient() {
  const [messages, setMessages] = useState<MeshMessageResponse[]>([]);
  const [nodeId, setNodeId] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [message, setMessage] = useState<MessageValue | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ limit: "50" });
    if (nodeId) params.set("nodeId", nodeId);
    if (ownerName) params.set("ownerName", ownerName);
    if (message) params.set("message", message);
    try {
      const response = await api.adminMessages(params);
      setMessages(response.messages);
    } catch {
      setError("Message history is unavailable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="grid gap-5">
      <Panel className="animate-fade-up grid gap-4 p-5 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
        <Field label="Node ID" value={nodeId} onChange={(event) => setNodeId(event.target.value)} placeholder="e.g. 123456" />
        <Field label="Owner name" value={ownerName} onChange={(event) => setOwnerName(event.target.value)} placeholder="e.g. Budi Santoso" />
        <SelectField label="Message value" value={message} onChange={(event) => setMessage(event.target.value as MessageValue | "")}>
          <option value="">All messages</option>
          {messageValueOptions.map((option) => (
            <option value={option.value} key={option.value}>{option.label}</option>
          ))}
        </SelectField>
        <Button onClick={load} loading={loading}>
          <MagnifyingGlass size={17} weight="bold" />
          Search
        </Button>
      </Panel>
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
      <Panel className="animate-fade-up overflow-hidden p-0" style={{ animationDelay: "80ms" }}>
        {loading ? (
          <div className="p-6">
            <Skeleton className="h-96 rounded-lg" />
          </div>
        ) : messages.length > 0 ? (
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {messages.length} message{messages.length !== 1 ? "s" : ""}
              </p>
            </div>
            <MessageTable messages={messages} />
          </div>
        ) : (
          <EmptyState
            icon={ListMagnifyingGlass}
            title="No messages found"
            description="No messages match these filters. Try adjusting your search criteria."
          />
        )}
      </Panel>
    </div>
  );
}
