"use client";

import type { MeshMessageResponse } from "@loom/contracts";
import { MapPin } from "@phosphor-icons/react/dist/ssr";
import { formatJakartaTime, messageLabel } from "@/lib/labels";
import { Badge } from "../ui";

export function MessageTable({ messages }: { messages: MeshMessageResponse[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead>
          <tr className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            <th className="pb-3">Message</th>
            <th className="pb-3">Sender</th>
            <th className="pb-3">SeqId</th>
            <th className="pb-3">Source</th>
            <th className="pb-3">Timestamp</th>
            <th className="pb-3">Received</th>
            <th className="pb-3">Range</th>
            <th className="pb-3">Location</th>
          </tr>
        </thead>
        <tbody>
          {messages.map((message, index) => (
            <tr
              key={message.messageId}
              className="stagger-item border-t border-slate-100 transition-colors hover:bg-slate-50/50"
              style={{ "--stagger-index": index } as React.CSSProperties}
            >
              <td className="py-3">
                <Badge tone={message.message === "fine" ? "safe" : "command"} dot>
                  {messageLabel(message.message)}
                </Badge>
              </td>
              <td className="py-3 font-mono text-xs font-semibold text-slate-700">{message.senderNodeId}</td>
              <td className="py-3 font-mono text-xs text-slate-500">{message.seqId}</td>
              <td className="py-3">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {message.source}
                </span>
              </td>
              <td className="py-3 text-xs text-slate-500">{formatJakartaTime(message.timestamp)}</td>
              <td className="py-3 text-xs text-slate-500">{formatJakartaTime(message.receivedByBackendAt)}</td>
              <td className="py-3 font-mono text-xs text-slate-500">
                {message.senderRangeToGateway} / {message.lastForwarderRangeToGateway}
              </td>
              <td className="py-3">
                {message.lat === null || message.lon === null ? (
                  <span className="text-xs text-slate-400">n/a</span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-500">
                    <MapPin size={11} weight="bold" className="text-slate-400" />
                    {message.lat.toFixed(4)}, {message.lon.toFixed(4)}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
