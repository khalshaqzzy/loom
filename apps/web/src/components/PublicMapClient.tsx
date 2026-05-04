"use client";

import type { HeatmapPoint, MessageValue } from "@loom/contracts";
import { markerSchema } from "@loom/contracts";
import type { z } from "zod";
import { ArrowClockwise, Lightning, MapPin, MapTrifold, ShieldCheck } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatJakartaTime, messageValueOptions } from "@/lib/labels";
import { MapVisual } from "./MapVisual";
import { PublicHistoryLookup } from "./PublicHistoryLookup";
import { Badge, Button, EmptyState, InlineAlert, Panel, SelectField, Skeleton, StatusDot } from "./ui";

type Marker = z.infer<typeof markerSchema>;

export function PublicMapClient() {
  const [message, setMessage] = useState<MessageValue | "">("");
  const [markerOnly, setMarkerOnly] = useState(false);
  const [mapType, setMapType] = useState("roadmap");
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [heatmap, markerResponse] = await Promise.all([api.publicHeatmap(message), api.publicMarkers()]);
      setPoints(heatmap.points);
      setMarkers(markerResponse.markers);
    } catch {
      setError("Map data is unavailable. History lookup remains available.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, [message]);

  const totalReports = points.reduce((sum, point) => sum + point.count, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="relative">
        {loading ? (
          <Skeleton className="h-[640px] rounded-xl" />
        ) : (
          <MapVisual points={points} markers={markers} markerOnly={markerOnly} mapType={mapType}>
            {/* Map controls - top left */}
            <div className="absolute left-4 top-4 flex flex-wrap items-start gap-3">
              <Panel className="flex items-center gap-2 p-2">
                <button
                  onClick={() => setMarkerOnly(false)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-all duration-200 ${
                    !markerOnly
                      ? "bg-command text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Heatmap
                </button>
                <button
                  onClick={() => setMarkerOnly(true)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-all duration-200 ${
                    markerOnly
                      ? "bg-command text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Markers
                </button>
              </Panel>
              <Panel className="p-2">
                <SelectField label="" value={mapType} onChange={(event) => setMapType(event.target.value)} className="text-xs">
                  <option value="roadmap">Roadmap</option>
                  <option value="satellite">Satellite</option>
                  <option value="terrain">Terrain</option>
                  <option value="hybrid">Hybrid</option>
                </SelectField>
              </Panel>
            </div>

            {/* Status bar - bottom */}
            <Panel className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div className="flex flex-wrap items-center gap-5 text-sm font-semibold text-slate-700">
                <span className="inline-flex items-center gap-2">
                  <StatusDot tone="mesh" />
                  Live
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} weight="bold" className="text-slate-400" />
                  Nodes <span className="font-mono font-black">{markers.length}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Lightning size={14} weight="bold" className="text-slate-400" />
                  Reports <span className="font-mono font-black">{totalReports}</span>
                </span>
              </div>
              <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-500">
                {mapType}
              </span>
            </Panel>
          </MapVisual>
        )}
        {error ? (
          <div className="mt-4 animate-fade-up">
            <InlineAlert tone="error">{error}</InlineAlert>
          </div>
        ) : null}
      </div>

      <aside className="grid content-start gap-5">
        {/* Filter panel */}
        <Panel className="animate-fade-up p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-command/10 text-command">
              <MapTrifold size={22} weight="bold" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-950">Public network map</h1>
              <p className="text-xs text-slate-500">Live heatmap of activity and connectivity</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4">
            <SelectField
              label="Filter by category"
              value={message}
              onChange={(event) => setMessage(event.target.value as MessageValue | "")}
            >
              <option value="">All categories</option>
              {messageValueOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
            <Button
              onClick={() => void load(true)}
              variant="secondary"
              loading={refreshing}
              disabled={loading}
            >
              <ArrowClockwise size={17} weight="bold" className={refreshing ? "animate-spin-slow" : ""} />
              Refresh
            </Button>
          </div>
        </Panel>

        {/* Lookup panel */}
        <PublicHistoryLookup compact />

        {/* Marker preview */}
        <Panel className="animate-fade-up p-5" style={{ animationDelay: "100ms" }}>
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <MapPin size={18} weight="bold" className="text-command" />
            Marker preview
          </h2>
          <div className="mt-4 grid gap-2.5">
            {markers.slice(0, 5).map((marker, index) => (
              <div
                key={marker.nodeId}
                className="stagger-item flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3.5 py-2.5 transition-colors hover:bg-slate-50"
                style={{ "--stagger-index": index } as React.CSSProperties}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-bold text-slate-800">{marker.nodeId}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {marker.lastMessageAt ? formatJakartaTime(marker.lastMessageAt) : "No reports yet"}
                  </p>
                </div>
                <Badge tone={marker.status === "active" ? "mesh" : "command"} dot>
                  {marker.status}
                </Badge>
              </div>
            ))}
            {!markers.length && !loading ? (
              <EmptyState
                icon={MapPin}
                title="No markers available"
                description="Public markers will appear here once nodes start reporting."
              />
            ) : null}
          </div>
        </Panel>

        {/* Privacy note */}
        <Panel className="animate-fade-up border-[var(--safe)]/20 bg-[var(--safe-soft)]/30 p-5" style={{ animationDelay: "150ms" }}>
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} weight="bold" className="mt-0.5 flex-none text-[var(--safe)]" />
            <div>
              <p className="text-sm font-bold text-[var(--safe)]">Privacy protected</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Public markers do not expose owner identity. Use history lookup with full name and birth date to find specific messages.
              </p>
            </div>
          </div>
        </Panel>
      </aside>
    </div>
  );
}
