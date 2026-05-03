# 0002 LoRa Protocol V2

Status: Accepted  
Date: 2026-05-04  
Scope: ESP32 LoRa packet format and routing behavior

## Context

LOOM must move emergency messages through a broadcast mesh when cellular and internet paths are not
available inside a disaster area. The MVP avoids targeted routing, ACKs, TTL, and RF simulation.

## Decision

Use LoRa protocol V2 with broadcast DATA packets and HEARTBEAT packets. DATA packets do not include
a target receiver. Nodes forward DATA only when `self.rangeToGateway` is lower than the packet's
`forwarderRangeToGateway`; forwarding updates only `forwarderRangeToGateway`.

## Rationale

The range-to-gateway gradient keeps routing simple enough for constrained ESP32 firmware while
letting packets move toward any node that currently has an internet path.

## Consequences

Duplicate packets are expected and must be deduplicated by firmware and backend using
`senderNodeId + seqId`. The protocol does not guarantee delivery in MVP.

## Follow-up

Firmware implementation must isolate codec, routing, dedup cache, pending queue, BLE bridge, and
LoRa transport.
