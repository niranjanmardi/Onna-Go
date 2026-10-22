# ONNA-GO — Offline Support Roadmap (Phase 3)

## Overview

In Phase 1, ONNA-GO operates as a connected web application with clear network error messaging if an API call fails. In Phase 3, offline expense drafting and synchronization will be enabled for remote road trips with spotty cell connectivity (e.g. mountain passes, highway stretches).

## Strategy & Technical Design

1. **Client-Side Draft Storage**:
   - Web: IndexedDB via Dexie.js or idb-keyval.
   - Mobile: Capacitor SQLite plugin for secure local device storage.
2. **Idempotency & Client-Generated UUIDs**:
   - Each drafted expense will be assigned a client-generated UUID `v4` prior to syncing.
   - The backend `/api/v1/expenses/` endpoint will enforce unique idempotency keys to prevent duplicate entries on retry.
3. **Pending Sync States**:
   - `DRAFT_LOCAL`: Saved on device, awaiting network connectivity.
   - `SYNCING`: Request in-flight.
   - `SYNCED`: Confirmed by PostgreSQL authoritative server.
   - `CONFLICT_NEEDS_REVIEW`: Concurrently modified or member removed.
4. **Authoritative Server Rule**:
   - Draft expenses never alter authoritative group balances until server confirmation.
5. **Conflict Resolution**:
   - Last-write-wins with explicit user review for disputed splits or modified amounts.
