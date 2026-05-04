"use client";

import type { MessageValue } from "@loom/contracts";
import { markerSchema } from "@loom/contracts";
import type { z } from "zod";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatJakartaTime, messageValueOptions, nodeStatusLabels } from "@/lib/labels";
import { MapVisual } from "../MapVisual";
import { Badge, Button, InlineAlert, Panel, SelectField, Skeleton } from "../ui";

type Marker = z.infer<typeof markerSchema>;

export function AdminMapClient() {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [selected, setSelected] = useState<Marker | null>(null);
  const [message, setMessage] = useState<MessageValue | "">("");
  const [markerOnly, setMarkerOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .adminMarkers()
      .then((response) => setMarkers(response.markers))
      .catch(() => setError("Admin markers are unavailable."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-[720px]" />;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <MapVisual markers={markers} markerOnly={markerOnly} onMarkerSelect={(marker) => setSelected(marker as Marker)}>
        <Panel className="absolute left-4 top-4 flex flex-wrap gap-3 p-3">
          <SelectField label="Message value" value={message} onChange={(event) => setMessage(event.target.value as MessageValue | "")}>
            <option value="">All categories</option>
            {messageValueOptions.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <Button variant={markerOnly ? "command" : "secondary"} onClick={() => setMarkerOnly((value) => !value)}>
            Marker-only
          </Button>
        </Panel>
      </MapVisual>
      <Panel className="p-6">
        <h2 className="text-xl font-black text-slate-950">Selected node</h2>
        {error ? <div className="mt-4"><InlineAlert tone="error">{error}</InlineAlert></div> : null}
        {selected ? (
          <div className="mt-5 grid gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">Node ID</p>
              <h3 className="text-3xl font-black">{selected.nodeId}</h3>
            </div>
            <Badge tone={selected.status === "active" ? "mesh" : "command"}>{nodeStatusLabels[selected.status as keyof typeof nodeStatusLabels] ?? selected.status}</Badge>
            <Info label="Owner" value={selected.ownerFullName ?? "Unavailable"} />
            <Info label="Last seen" value={formatJakartaTime(selected.lastSeenAt)} />
            <Info label="Last message" value={formatJakartaTime(selected.lastMessageAt)} />
            <Info label="Range to gateway" value={selected.lastRangeToGateway === null ? "Unavailable" : String(selected.lastRangeToGateway)} />
            <a className="font-bold text-command" href={`/admin/nodes/${selected.nodeIdNumeric}`}>
              Open node detail
            </a>
          </div>
        ) : (
          <InlineAlert>Choose a marker to inspect node details and history.</InlineAlert>
        )}
      </Panel>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-mist p-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
