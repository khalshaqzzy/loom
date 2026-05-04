"use client";

import type { RegisteredNodeResponse } from "@loom/contracts";
import { Plus, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatJakartaTime } from "@/lib/labels";
import { Badge, Button, Field, InlineAlert, Panel, Skeleton } from "../ui";

export function AdminNodesClient() {
  const [nodes, setNodes] = useState<RegisteredNodeResponse[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (term = search) => {
    setError("");
    try {
      const response = await api.nodes(term);
      setNodes(response.nodes);
    } catch {
      setError("Registered nodes are unavailable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = window.setTimeout(() => void load(search), 250);
    return () => window.clearTimeout(id);
  }, [search]);

  return (
    <div className="grid gap-5">
      <Panel className="flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between">
        <Field label="Search node ID or owner name" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Button onClick={() => setOpen(true)}>
          <Plus size={18} weight="bold" />
          Register node
        </Button>
      </Panel>
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
      {loading ? (
        <Skeleton className="h-96" />
      ) : (
        <Panel className="overflow-x-auto p-5">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-3">Node ID</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Last seen</th>
                <th>Last message</th>
                <th>Range</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node) => (
                <tr key={node.nodeId} className="border-t border-border">
                  <td className="py-3 font-mono font-semibold">{node.nodeId}</td>
                  <td>{node.ownerFullName}</td>
                  <td><Badge tone={node.status === "active" ? "mesh" : "command"}>{node.status}</Badge></td>
                  <td>{formatJakartaTime(node.lastSeenAt)}</td>
                  <td>{formatJakartaTime(node.lastMessageAt)}</td>
                  <td className="font-mono">{node.lastRangeToGateway ?? "n/a"}</td>
                  <td><Link className="font-bold text-command" href={`/admin/nodes/${node.nodeIdNumeric}`}>View detail</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!nodes.length ? <div className="py-12 text-center font-semibold text-slate-600">No registered nodes match this search.</div> : null}
        </Panel>
      )}
      {open ? <RegisterNodeDialog onClose={() => setOpen(false)} onSaved={() => void load()} /> : null}
    </div>
  );
}

function RegisterNodeDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [nodeId, setNodeId] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerBirthDate, setOwnerBirthDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const numeric = Number(nodeId);
    if (!Number.isInteger(numeric) || numeric < 0 || numeric > 16777215) {
      setError("Node ID must be an integer from 0 to 16777215.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.registerNode({ nodeId: numeric, ownerFullName, ownerBirthDate });
      onSaved();
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Node registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-5 backdrop-blur-sm">
      <Panel className="w-full max-w-lg p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Register a node</h2>
            <p className="mt-2 text-sm text-slate-600">Birth date is collected for validation and never displayed.</p>
          </div>
          <Button variant="ghost" aria-label="Close register node dialog" onClick={onClose}>
            <X size={20} weight="bold" />
          </Button>
        </div>
        <form className="mt-6 grid gap-5" onSubmit={submit}>
          <Field label="Node ID" value={nodeId} onChange={(event) => setNodeId(event.target.value)} required />
          <Field label="Owner full name" value={ownerFullName} onChange={(event) => setOwnerFullName(event.target.value)} required />
          <Field label="Owner birth date" type="date" value={ownerBirthDate} onChange={(event) => setOwnerBirthDate(event.target.value)} required />
          {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
          <Button disabled={loading}>{loading ? "Registering" : "Register node"}</Button>
        </form>
      </Panel>
    </div>
  );
}
