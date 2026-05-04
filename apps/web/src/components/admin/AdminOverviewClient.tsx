"use client";

import { Broadcast, CloudArrowUp, MapTrifold, TreeStructure } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { MeshMessageResponse, RegisteredNodeResponse } from "@loom/contracts";
import { api } from "@/lib/api";
import { formatJakartaTime, messageLabel } from "@/lib/labels";
import { Badge, InlineAlert, Panel, Skeleton } from "../ui";
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

  if (loading) return <Skeleton className="h-[620px]" />;

  return (
    <div className="grid gap-5">
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Panel className="p-4">
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
            <div className="absolute left-4 top-4 rounded-lg bg-white/90 p-4 shadow-soft">
              <h2 className="flex items-center gap-2 font-black">
                <MapTrifold size={20} weight="bold" className="text-command" />
                Operational map preview
              </h2>
            </div>
          </MapVisual>
        </Panel>
        <Panel className="p-6">
          <h2 className="text-xl font-black text-slate-950">System status</h2>
          <div className="mt-6 grid gap-4">
            <Metric icon={<TreeStructure size={24} weight="bold" />} label="Registered nodes" value={nodes.length} />
            <Metric icon={<Broadcast size={24} weight="bold" />} label="Active nodes" value={nodes.filter((node) => node.status === "active").length} />
            <Metric icon={<CloudArrowUp size={24} weight="bold" />} label="Recent messages" value={messages.length} />
          </div>
        </Panel>
      </div>
      <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
        <Panel className="p-6">
          <h2 className="text-xl font-black text-slate-950">Stale nodes</h2>
          <div className="mt-4 grid gap-3">
            {nodes.slice(0, 5).map((node) => (
              <div key={node.nodeId} className="flex items-center justify-between rounded-lg bg-mist p-3">
                <span className="font-semibold">{node.nodeId}</span>
                <Badge tone={node.status === "active" ? "mesh" : "attention"}>{node.status}</Badge>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-6">
          <h2 className="text-xl font-black text-slate-950">Recent messages</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-3">Message</th>
                  <th>Sender</th>
                  <th>SeqId</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((message) => (
                  <tr key={message.messageId} className="border-t border-border">
                    <td className="py-3 font-semibold">{messageLabel(message.message)}</td>
                    <td className="font-mono">{message.senderNodeId}</td>
                    <td className="font-mono">{message.seqId}</td>
                    <td>{formatJakartaTime(message.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-mist p-4">
      <div className="text-command">{icon}</div>
      <div className="mt-4 text-3xl font-black">{value}</div>
      <div className="text-sm font-semibold text-slate-600">{label}</div>
    </div>
  );
}
