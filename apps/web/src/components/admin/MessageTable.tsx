"use client";

import type { MeshMessageResponse } from "@loom/contracts";
import { formatJakartaTime, messageLabel } from "@/lib/labels";
import { Badge } from "../ui";

export function MessageTable({ messages }: { messages: MeshMessageResponse[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="text-slate-500">
          <tr>
            <th className="py-3">Message</th>
            <th>Sender</th>
            <th>SeqId</th>
            <th>Source</th>
            <th>Timestamp</th>
            <th>Backend received</th>
            <th>Range</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          {messages.map((message) => (
            <tr key={message.messageId} className="border-t border-border">
              <td className="py-3"><Badge tone={message.message === "fine" ? "safe" : "command"}>{messageLabel(message.message)}</Badge></td>
              <td className="font-mono">{message.senderNodeId}</td>
              <td className="font-mono">{message.seqId}</td>
              <td>{message.source}</td>
              <td>{formatJakartaTime(message.timestamp)}</td>
              <td>{formatJakartaTime(message.receivedByBackendAt)}</td>
              <td className="font-mono">{message.senderRangeToGateway} / {message.lastForwarderRangeToGateway}</td>
              <td className="font-mono">{message.lat === null || message.lon === null ? "n/a" : `${message.lat.toFixed(4)}, ${message.lon.toFixed(4)}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
