# 0005 Public Lookup Privacy Model

Status: Accepted  
Date: 2026-05-04  
Scope: public message-history access control

## Context

Public users need to find a node owner's message history without creating an account. Full name and
birth date are sensitive enough that failed lookups must not become an enumeration channel.

## Decision

Public history lookup requires an owner full-name and birth-date pair. The backend normalizes the
name, hashes the submitted birth date with an application secret, and returns message history only
when both values match a registered node owner.

## Rationale

This provides a low-friction MVP gate while avoiding persistent public sessions or OTP. Hashing keeps
birth-date comparison server-side and avoids exposing birth dates through public APIs.

## Consequences

Wrong birth date and unknown owner responses must have the same generic shape. Public lookup needs
rate limiting and audit logging.

## Follow-up

The backend API implements the generic failure behavior. Frontend lookup UI must preserve it and
must not introduce name-existence or birth-date-specific error states.
