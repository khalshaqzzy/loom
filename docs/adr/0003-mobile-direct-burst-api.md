# 0003 Mobile Direct Burst API

Status: Accepted  
Date: 2026-05-04  
Scope: mobile-to-cloud uplink behavior

## Context

Mobile phones are the primary opportunistic internet bridge for LoRa messages. When a phone regains
internet, it needs to sync node backlog without additional infrastructure.

## Decision

The mobile app uploads received backlog directly to the Express backend with
`POST /api/ingest/burst`. The backend treats `senderNodeId + seqId` as the global deduplication key
across all uploaders.

## Rationale

Direct HTTPS upload avoids a separate gateway service and keeps all server-side mutations behind the
backend API. Global deduplication handles the expected case where multiple phones upload the same
LoRa packet.

## Consequences

The ingest endpoint must support per-item accepted, duplicate, and rejected outcomes. Duplicates from
other phones are successful sync outcomes for the uploading app, not errors.

## Follow-up

Mobile implementation must retain local backlog until the backend marks each item accepted or
duplicate.
