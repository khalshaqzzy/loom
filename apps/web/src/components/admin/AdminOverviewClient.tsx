"use client";

import {
  Broadcast,
  CloudArrowUp,
  MapTrifold,
  TreeStructure,
  ArrowRight,
  Clock
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { MeshMessageResponse, RegisteredNodeResponse } from "@loom/contracts";
import { api } from "@/lib/api";
import { formatJakartaTime, messageLabel } from "@/lib/labels";
import { Badge, EmptyState, InlineAlert, Panel, Skeleton, StatusDot } from "../ui";
import { MapVisual } from "../MapVisual";

export function AdminOverviewClient() {
  const [nodes, setNodes] = useState<RegisteredNodeResponse[]>([]);
  const [messages, setMessages] = useState<MeshMessageResponse[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.nodes(), api.adminMessages(new URLSearchParams({ limit: "8" }))])
      .then(([nodeResponse, messageResponse]) => {
        setNodes(nodeResponse.nodes);
        setMessages(messageResponse.messages);
      })
      .catch(() => setError("Overview data is unavailable."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-5">
        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <Skeleton className="h-[420px] rounded-xl" />
          <div className="grid gap-5">
            <Skeleton className="h-[195px] rounded-xl" />
            <Skeleton className="h-[195px] rounded-xl" />
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
          <Skeleton className="h-[320px] rounded-xl" />
          <Skeleton className="h-[320px] rounded-xl" />
        </div>
      </div>
    );
  }

  const activeCount = nodes.filter((n) => n.status === "active").length;
  const staleNodes = nodes.filter((n) => n.status !== "active").slice(0, 6);
  const latestSync = messages[0]?.receivedByBackendAt ?? null;

  return (
    <div className="grid gap-5">
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      {/* Row 1: Map (2fr) + Status stack (1fr) */}
      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Panel className="animate-fade-up overflow-hidden p-0">
          <div className="relative h-[420px]">
            <MapVisual
              markers={nodes.map((node) => ({
                nodeId: node.nodeId,
                nodeIdNumeric: node.nodeIdNumeric,
                lat: node.lastKnownLat,
                lon: node.lastKnownLon,
                status: node.status,
                ownerFullName: node.ownerFullName
              }))}
              markerOnly
            >
              <div className="absolute left-4 top-4">
                <div className="glass-panel flex items-center gap-2.5 rounded-xl px-4 py-3">
                  <MapTrifold size={18} weight="bold" className="text-command" />
                  <span className="text-sm font-bold text-slate-800">Operational map</span>
                  <StatusDot tone="mesh" size="xs" />
                </div>
              </div>
            </MapVisual>
          </div>
        </Panel>

        <div className="grid gap-5">
          <MetricCard
            icon={<TreeStructure size={22} weight="bold" />}
            label="Registered nodes"
            value={nodes.length}
            accent="command"
            index={0}
          />
          <MetricCard
            icon={<Broadcast size={22} weight="bold" />}
            label="Active nodes"
            value={activeCount}
            accent="mesh"
            index={1}
          />
          <MetricCard
            icon={<CloudArrowUp size={22} weight="bold" />}
            label="Recent messages"
            value={messages.length}
            accent="command"
            index={2}
          />
          <MetricCard
            icon={<Clock size={22} weight="bold" />}
            label="Last sync"
            value={latestSync ? formatJakartaTime(latestSync) : "None"}
            accent="attention"
            index={3}
            isText
          />
        </div>
      </div>

      {/* Row 2: Stale nodes (1fr) + Recent messages (1.6fr) */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        <Panel className="animate-fade-up p-6" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900">Node status</h2>
            <a
              href="/admin/nodes"
              className="flex items-center gap-1 text-xs font-bold text-command transition-colors hover:text-blue-700"
            >
              View all
              <ArrowRight size={13} weight="bold" />
            </a>
          </div>
          <div className="mt-5 grid gap-2.5">
            {staleNodes.length > 0 ? (
              staleNodes.map((node, index) => (
                <div
                  key={node.nodeId}
                  className="stagger-item flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-3.5 py-2.5 transition-colors hover:bg-slate-50"
                  style={{ "--stagger-index": index } as React.CSSProperties}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm font-bold text-slate-800">
                      {node.nodeId}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{node.ownerFullName}</p>
                  </div>
                  <Badge
                    tone={
                      node.status === "active"
                        ? "mesh"
                        : node.status === "inactive"
                          ? "attention"
                          : "unknown"
                    }
                    dot
                  >
                    {node.status}
                  </Badge>
                </div>
              ))
            ) : (
              <EmptyState
                icon={TreeStructure}
                title="No nodes registered"
                description="Register your first node to start monitoring the mesh network."
              />
            )}
          </div>
        </Panel>

        <Panel className="animate-fade-up p-6" style={{ animationDelay: "180ms" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900">Recent messages</h2>
            <a
              href="/admin/messages"
              className="flex items-center gap-1 text-xs font-bold text-command transition-colors hover:text-blue-700"
            >
              View all
              <ArrowRight size={13} weight="bold" />
            </a>
          </div>
          <div className="mt-5 overflow-x-auto">
            {messages.length > 0 ? (
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="pb-3">Message</th>
                    <th className="pb-3">Sender</th>
                    <th className="pb-3">SeqId</th>
                    <th className="pb-3">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((message, index) => (
                    <tr
                      key={message.messageId}
                      className="stagger-item border-t border-slate-100 transition-colors hover:bg-slate-50/50"
                      style={{ "--stagger-index": index } as React.CSSProperties}
                    >
                      <td className="py-2.5">
                        <Badge tone={message.message === "fine" ? "safe" : "command"} dot>
                          {messageLabel(message.message)}
                        </Badge>
                      </td>
                      <td className="py-2.5 font-mono text-xs font-semibold text-slate-700">
                        {message.senderNodeId}
                      </td>
                      <td className="py-2.5 font-mono text-xs text-slate-500">{message.seqId}</td>
                      <td className="py-2.5 text-xs text-slate-500">
                        {formatJakartaTime(message.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState
                icon={CloudArrowUp}
                title="No messages yet"
                description="Messages will appear here once the mesh network starts reporting."
              />
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  accent = "command",
  index = 0,
  isText = false
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: "command" | "mesh" | "attention";
  index?: number;
  isText?: boolean;
}) {
  const countRef = useRef<HTMLParagraphElement>(null);
  const [displayValue, setDisplayValue] = useState<number | string>(isText ? value : 0);

  useEffect(() => {
    if (isText || typeof value !== "number") {
      setDisplayValue(value);
      return;
    }

    const target = value;
    const duration = 600;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [value, isText]);

  const accentBg =
    accent === "mesh"
      ? "bg-[var(--mesh-soft)]"
      : accent === "attention"
        ? "bg-[var(--attention-soft)]"
        : "bg-[var(--command-soft)]";
  const accentText =
    accent === "mesh"
      ? "text-[var(--mesh)]"
      : accent === "attention"
        ? "text-[var(--attention)]"
        : "text-command";

  return (
    <Panel
      className="stagger-item hover-lift flex items-center gap-4 p-5"
      style={{ "--stagger-index": index } as React.CSSProperties}
    >
      <div className={`grid size-11 place-items-center rounded-xl ${accentBg} ${accentText}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p
          ref={countRef}
          className="mt-0.5 font-mono text-2xl font-black tracking-tight text-slate-900"
        >
          {isText ? displayValue : displayValue}
        </p>
      </div>
    </Panel>
  );
}
