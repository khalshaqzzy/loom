"use client";

import type { MeshMessageResponse, RegisteredNodeResponse, MessageValue } from "@loom/contracts";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatJakartaTime, messageValueOptions } from "@/lib/labels";
import { Badge, InlineAlert, Panel, SelectField, Skeleton } from "../ui";
import { MessageTable } from "./MessageTable";

export function AdminNodeDetailClient({ nodeId }: { nodeId: string }) {
  const [node, setNode] = useState<RegisteredNodeResponse | null>(null);
  const [messages, setMessages] = useState<MeshMessageResponse[]>([]);
  const [message, setMessage] = useState<MessageValue | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([api.node(nodeId), api.nodeMessages(nodeId, message)])
      .then(([nodeResponse, messageResponse]) => {
        setNode(nodeResponse.node);
        setMessages(messageResponse.messages);
      })
      .catch(() => setError("Node detail is unavailable."))
      .finally(() => setLoading(false));
  }, [nodeId, message]);

  if (loading) return <Skeleton className="h-[620px]" />;
  if (error || !node) return <InlineAlert tone="error">{error || "Node detail is unavailable."}</InlineAlert>;

  return (
    <div className="grid gap-5">
      <Panel className="p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row">
          <div>
            <p className="text-sm font-semibold text-slate-500">Node identity</p>
            <h2 className="mt-2 text-4xl font-black text-slate-950">{node.nodeId}</h2>
            <p className="mt-2 text-lg font-semibold text-slate-700">{node.ownerFullName}</p>
          </div>
          <Badge tone={node.status === "active" ? "mesh" : "command"}>{node.status}</Badge>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Info label="Last seen" value={formatJakartaTime(node.lastSeenAt)} />
          <Info label="Last message" value={formatJakartaTime(node.lastMessageAt)} />
          <Info label="Range" value={node.lastRangeToGateway === null ? "Unavailable" : String(node.lastRangeToGateway)} />
          <Info label="Location" value={node.lastKnownLat === null || node.lastKnownLon === null ? "Unavailable" : `${node.lastKnownLat.toFixed(4)}, ${node.lastKnownLon.toFixed(4)}`} />
        </div>
      </Panel>
      <Panel className="p-6">
        <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <h2 className="text-2xl font-black text-slate-950">Message history</h2>
          <SelectField label="Filter by message" value={message} onChange={(event) => setMessage(event.target.value as MessageValue | "")}>
            <option value="">All messages</option>
            {messageValueOptions.map((option) => (
              <option value={option.value} key={option.value}>{option.label}</option>
            ))}
          </SelectField>
        </div>
        <MessageTable messages={messages} />
        {!messages.length ? <div className="py-10 text-center font-semibold text-slate-600">No messages match this node filter.</div> : null}
      </Panel>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-mist p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 font-semibold text-slate-950">{value}</p>
    </div>
  );
}
