"use client";

import type { MeshMessageResponse, MessageValue } from "@loom/contracts";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { messageValueOptions } from "@/lib/labels";
import { Button, Field, InlineAlert, Panel, SelectField, Skeleton } from "../ui";
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
      <Panel className="grid gap-4 p-5 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
        <Field label="Node ID" value={nodeId} onChange={(event) => setNodeId(event.target.value)} />
        <Field label="Owner name" value={ownerName} onChange={(event) => setOwnerName(event.target.value)} />
        <SelectField label="Message value" value={message} onChange={(event) => setMessage(event.target.value as MessageValue | "")}>
          <option value="">All messages</option>
          {messageValueOptions.map((option) => (
            <option value={option.value} key={option.value}>{option.label}</option>
          ))}
        </SelectField>
        <Button onClick={load}><MagnifyingGlass size={18} weight="bold" />Search</Button>
      </Panel>
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
      <Panel className="p-6">
        {loading ? <Skeleton className="h-96" /> : <MessageTable messages={messages} />}
        {!loading && !messages.length ? <div className="py-10 text-center font-semibold text-slate-600">No messages match these filters.</div> : null}
      </Panel>
    </div>
  );
}
