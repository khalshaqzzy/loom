"use client";

import type { MeshMessageResponse, RegisteredNodeResponse, MessageValue } from "@loom/contracts";
import { ArrowLeft, Broadcast, Clock, MapPin, WifiHigh } from "@phosphor-icons/react";
import Link from "next/link";
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

  if (loading) return <Skeleton className="h-[620px] rounded-xl" />;
  if (error || !node) return <InlineAlert tone="error">{error || "Node detail is unavailable."}</InlineAlert>;

  return (
    <div className="grid gap-5">
      {/* Node identity header */}
      <Panel className="animate-fade-up overflow-hidden">
        <div className="relative bg-gradient-to-br from-command/5 via-transparent to-[var(--mesh)]/5 px-7 py-8">
          <Link
            href="/admin/nodes"
            className="mb-5 inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 transition-colors hover:text-command"
          >
            <ArrowLeft size={14} weight="bold" />
            Back to nodes
          </Link>
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Node identity</p>
              <h2 className="mt-2 font-mono text-4xl font-black tracking-tight text-slate-950">{node.nodeId}</h2>
              <p className="mt-2 text-lg font-semibold text-slate-700">{node.ownerFullName}</p>
            </div>
            <Badge tone={node.status === "active" ? "mesh" : node.status === "inactive" ? "attention" : "unknown"} dot>
              {node.status}
            </Badge>
          </div>
        </div>
        <div className="grid gap-3 border-t border-slate-100 bg-slate-50/30 px-7 py-5 md:grid-cols-4">
          <InfoCard icon={<Clock size={18} weight="bold" />} label="Last seen" value={formatJakartaTime(node.lastSeenAt)} />
          <InfoCard icon={<Broadcast size={18} weight="bold" />} label="Last message" value={formatJakartaTime(node.lastMessageAt)} />
          <InfoCard
            icon={<WifiHigh size={18} weight="bold" />}
            label="Range to gateway"
            value={node.lastRangeToGateway === null ? "Unavailable" : String(node.lastRangeToGateway)}
            mono
          />
          <InfoCard
            icon={<MapPin size={18} weight="bold" />}
            label="Location"
            value={node.lastKnownLat === null || node.lastKnownLon === null ? "Unavailable" : `${node.lastKnownLat.toFixed(4)}, ${node.lastKnownLon.toFixed(4)}`}
            mono
          />
        </div>
      </Panel>

      {/* Message history */}
      <Panel className="animate-fade-up p-6" style={{ animationDelay: "100ms" }}>
        <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <h2 className="text-xl font-black tracking-tight text-slate-950">Message history</h2>
          <SelectField label="Filter by message" value={message} onChange={(event) => setMessage(event.target.value as MessageValue | "")}>
            <option value="">All messages</option>
            {messageValueOptions.map((option) => (
              <option value={option.value} key={option.value}>{option.label}</option>
            ))}
          </SelectField>
        </div>
        {messages.length > 0 ? (
          <MessageTable messages={messages} />
        ) : (
          <div className="py-12 text-center text-sm font-semibold text-slate-400">
            No messages match this node filter.
          </div>
        )}
      </Panel>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  mono = false
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="stagger-item flex items-start gap-3 rounded-lg border border-slate-100 bg-white/60 px-4 py-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className={`mt-0.5 text-sm font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
