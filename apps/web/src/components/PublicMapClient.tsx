"use client";

import type { HeatmapPoint, MessageValue } from "@loom/contracts";
import { markerSchema } from "@loom/contracts";
import type { z } from "zod";
import { ArrowClockwise, MapPin, MapTrifold } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatJakartaTime, messageValueOptions } from "@/lib/labels";
import { MapVisual } from "./MapVisual";
import { PublicHistoryLookup } from "./PublicHistoryLookup";
import { Badge, Button, InlineAlert, Panel, SelectField, Skeleton } from "./ui";

type Marker = z.infer<typeof markerSchema>;

export function PublicMapClient() {
  const [message, setMessage] = useState<MessageValue | "">("");
  const [markerOnly, setMarkerOnly] = useState(false);
  const [mapType, setMapType] = useState("roadmap");
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [heatmap, markerResponse] = await Promise.all([api.publicHeatmap(message), api.publicMarkers()]);
      setPoints(heatmap.points);
      setMarkers(markerResponse.markers);
    } catch {
      setError("Map data is unavailable. History lookup remains available.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [message]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="relative">
        {loading ? (
          <Skeleton className="h-[640px] rounded-xl" />
        ) : (
          <MapVisual points={points} markers={markers} markerOnly={markerOnly}>
            <div className="absolute left-4 top-4 flex flex-wrap gap-3">
              <Panel className="flex items-center gap-3 p-3">
                <Button variant={markerOnly ? "secondary" : "command"} onClick={() => setMarkerOnly(false)}>
                  Heatmap
                </Button>
                <Button variant={markerOnly ? "command" : "secondary"} onClick={() => setMarkerOnly(true)}>
                  Markers
                </Button>
              </Panel>
              <Panel className="p-3">
                <SelectField label="Map type" value={mapType} onChange={(event) => setMapType(event.target.value)}>
                  <option value="roadmap">Roadmap</option>
                  <option value="satellite">Satellite</option>
                  <option value="terrain">Terrain</option>
                  <option value="hybrid">Hybrid</option>
                </SelectField>
              </Panel>
            </div>
            <Panel className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex flex-wrap items-center gap-5 text-sm font-semibold text-slate-700">
                <span className="inline-flex items-center gap-2">
                  <span className="size-2 rounded-full bg-mesh" />
                  Live
                </span>
                <span>Nodes {markers.length}</span>
                <span>Reports {points.reduce((sum, point) => sum + point.count, 0)}</span>
              </div>
              <span className="font-mono text-xs text-slate-500">Mode {mapType}</span>
            </Panel>
          </MapVisual>
        )}
        {error ? <div className="mt-4"><InlineAlert tone="error">{error}</InlineAlert></div> : null}
      </div>
      <aside className="grid content-start gap-5">
        <Panel className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-slate-950">Public network map</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">Live heatmap of activity and connectivity.</p>
            </div>
            <MapTrifold size={32} className="text-command" weight="bold" />
          </div>
          <div className="mt-5 grid gap-4">
            <SelectField label="Filter by category" value={message} onChange={(event) => setMessage(event.target.value as MessageValue | "")}>
              <option value="">All categories</option>
              {messageValueOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
            <Button onClick={load} variant="secondary">
              <ArrowClockwise size={18} weight="bold" />
              Refresh
            </Button>
          </div>
        </Panel>
        <PublicHistoryLookup compact />
        <Panel className="p-5">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <MapPin size={20} weight="bold" className="text-command" />
            Public marker preview
          </h2>
          <div className="mt-4 grid gap-3">
            {markers.slice(0, 4).map((marker) => (
              <div key={marker.nodeId} className="rounded-lg border border-border bg-mist p-3">
                <div className="flex items-center justify-between gap-3">
                  <strong>{marker.nodeId}</strong>
                  <Badge tone={marker.status === "active" ? "mesh" : "command"}>{marker.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-600">Last report {formatJakartaTime(marker.lastMessageAt)}</p>
              </div>
            ))}
            {!markers.length && !loading ? <InlineAlert>No public markers are available yet.</InlineAlert> : null}
          </div>
        </Panel>
      </aside>
    </div>
  );
}
