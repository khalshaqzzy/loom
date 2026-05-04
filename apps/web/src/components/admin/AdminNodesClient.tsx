"use client";

import type { RegisteredNodeResponse } from "@loom/contracts";
import { MagnifyingGlass, Plus, TreeStructure, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatJakartaTime } from "@/lib/labels";
import { Badge, Button, EmptyState, Field, InlineAlert, Panel, Skeleton } from "../ui";

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
      <Panel className="animate-fade-up flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between">
        <div className="relative max-w-md flex-1">
          <MagnifyingGlass
            size={17}
            weight="bold"
            className="absolute left-3.5 top-[34px] text-slate-400"
          />
          <Field
            label="Search node ID or owner name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={17} weight="bold" />
          Register node
        </Button>
      </Panel>
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
      {loading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <Panel className="animate-fade-up overflow-hidden p-0">
          {nodes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3.5">Node ID</th>
                    <th className="px-5 py-3.5">Owner</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Last seen</th>
                    <th className="px-5 py-3.5">Last message</th>
                    <th className="px-5 py-3.5">Range</th>
                    <th className="px-5 py-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.map((node, index) => (
                    <tr
                      key={node.nodeId}
                      className="stagger-item border-b border-slate-50 transition-colors hover:bg-slate-50/50"
                      style={{ "--stagger-index": index } as React.CSSProperties}
                    >
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-800">{node.nodeId}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-700">{node.ownerFullName}</td>
                      <td className="px-5 py-3.5">
                        <Badge tone={node.status === "active" ? "mesh" : node.status === "inactive" ? "attention" : "unknown"} dot>
                          {node.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{formatJakartaTime(node.lastSeenAt)}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{formatJakartaTime(node.lastMessageAt)}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{node.lastRangeToGateway ?? "n/a"}</td>
                      <td className="px-5 py-3.5">
                        <Link
                          className="text-xs font-bold text-command transition-colors hover:text-blue-700"
                          href={`/admin/nodes/${node.nodeIdNumeric}`}
                        >
                          View detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={TreeStructure}
              title="No registered nodes"
              description={search ? "No nodes match this search. Try a different term." : "Register your first node to start monitoring the mesh network."}
              action={
                !search ? (
                  <Button onClick={() => setOpen(true)}>
                    <Plus size={17} weight="bold" />
                    Register node
                  </Button>
                ) : undefined
              }
            />
          )}
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
    <div className="fixed inset-0 z-50 grid place-items-center px-5">
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <Panel className="relative w-full max-w-lg animate-slide-up p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-950">Register a node</h2>
            <p className="mt-1.5 text-sm text-slate-500">Birth date is collected for validation and never displayed.</p>
          </div>
          <button
            className="grid size-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close register node dialog"
            onClick={onClose}
          >
            <X size={18} weight="bold" />
          </button>
        </div>
        <form className="mt-6 grid gap-5" onSubmit={submit}>
          <Field
            label="Node ID"
            value={nodeId}
            onChange={(event) => setNodeId(event.target.value)}
            placeholder="e.g. 123456"
            hint="Integer from 0 to 16777215 (uint24)"
            required
          />
          <Field
            label="Owner full name"
            value={ownerFullName}
            onChange={(event) => setOwnerFullName(event.target.value)}
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
          {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Register node
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
