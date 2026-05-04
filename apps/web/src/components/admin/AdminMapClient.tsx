"use client";

import type { HeatmapPoint, MessageValue } from "@loom/contracts";
import { markerSchema } from "@loom/contracts";
import type { z } from "zod";
import { ArrowRight, MapPin, MapTrifold } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatJakartaTime, messageValueOptions, nodeStatusLabels } from "@/lib/labels";
import { MapVisual } from "../MapVisual";
import { Badge, Button, EmptyState, InlineAlert, Panel, SelectField, Skeleton } from "../ui";

type Marker = z.infer<typeof markerSchema>;

export function AdminMapClient() {
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [selected, setSelected] = useState<Marker | null>(null);
  const [message, setMessage] = useState<MessageValue | "">("");
  const [markerOnly, setMarkerOnly] = useState(false);
  const [mapType, setMapType] = useState("roadmap");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([api.adminHeatmap(message), api.adminMarkers()])
      .then(([heatmapResponse, markerResponse]) => {
        setPoints(heatmapResponse.points);
        setMarkers(markerResponse.markers);
      })
      .catch(() => setError("Admin map data is unavailable."))
      .finally(() => setLoading(false));
  }, [message]);

  if (loading) return <Skeleton className="h-[720px] rounded-xl" />;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <MapVisual
        points={points}
        markers={markers}
        markerOnly={markerOnly}
        mapType={mapType}
        onMarkerSelect={(marker) => setSelected(marker as Marker)}
      >
        <Panel className="absolute left-4 top-4 flex flex-wrap items-end gap-3 p-3">
          <SelectField label="Message value" value={message} onChange={(event) => setMessage(event.target.value as MessageValue | "")}>
            <option value="">All categories</option>
            {messageValueOptions.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <SelectField label="Map type" value={mapType} onChange={(event) => setMapType(event.target.value)}>
            <option value="roadmap">Roadmap</option>
            <option value="satellite">Satellite</option>
            <option value="terrain">Terrain</option>
            <option value="hybrid">Hybrid</option>
          </SelectField>
          <Button variant={markerOnly ? "command" : "secondary"} onClick={() => setMarkerOnly((value) => !value)}>
            Marker-only
          </Button>
        </Panel>
      </MapVisual>

      <Panel className="animate-fade-up p-6">
        <h2 className="flex items-center gap-2 text-base font-black text-slate-900">
          <MapPin size={18} weight="bold" className="text-command" />
          Selected node
        </h2>
        {error ? (
          <div className="mt-4">
            <InlineAlert tone="error">{error}</InlineAlert>
          </div>
        ) : null}
        {selected ? (
          <div className="mt-5 animate-fade-up">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Node ID</p>
                <h3 className="mt-1 font-mono text-2xl font-black text-slate-950">{selected.nodeId}</h3>
              </div>
              <Badge tone={selected.status === "active" ? "mesh" : "command"} dot>
                {nodeStatusLabels[selected.status as keyof typeof nodeStatusLabels] ?? selected.status}
              </Badge>
            </div>
            <div className="mt-5 grid gap-3">
              <InfoCard label="Owner" value={selected.ownerFullName ?? "Unavailable"} />
              <InfoCard label="Last seen" value={formatJakartaTime(selected.lastSeenAt)} />
              <InfoCard label="Last message" value={formatJakartaTime(selected.lastMessageAt)} />
              <InfoCard
                label="Range to gateway"
                value={selected.lastRangeToGateway === null ? "Unavailable" : String(selected.lastRangeToGateway)}
                mono
              />
            </div>
            <a
              className="mt-5 flex items-center gap-2 text-sm font-bold text-command transition-colors hover:text-blue-700"
              href={`/admin/nodes/${selected.nodeIdNumeric}`}
            >
              Open node detail
              <ArrowRight size={15} weight="bold" />
            </a>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              icon={MapTrifold}
              title="No node selected"
              description="Choose a marker to inspect node details and history."
            />
          </div>
        )}
      </Panel>
    </div>
  );
}

function InfoCard({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
