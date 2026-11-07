# ADR 0004: Next Signal name and required verification tooling

- Date: 2026-10-28
- Status: Owner confirmed
- Owner: Project owner

## Decision

The public product name is **Next Signal**, with a space. This supersedes the pending naming decision in ADR 0003. The existing PNG wordmarks spell NextSignal; preserve them until a separate asset update. Keep repository paths, package names, database identifiers and historical records stable. Update the functional page heading and browser title without selecting a new visual system.

The owner has installed Docker Desktop. Check CLI and daemon readiness separately. At this task's initial check, the CLI was present but docker info could not connect to the Docker Desktop Linux engine. No Docker-dependent test was run or claimed successful.

When a required tool is missing or not running, report the tool and affected verification gate to the owner. Do not work around the tool with a substitute environment and count that as passing the original gate. PGlite remains the existing local M1 fixture runtime, not a replacement for native PostgreSQL/Supabase verification. Starting the existing fixture does not change database architecture or close any native database release gate.

## Security, cost and rollback

Real APIs, payments and deployment remain disabled. No Docker images or new tools are installed by this task. No customer data migration, production infrastructure change or legal/trademark clearance is implied. The display name can be reverted independently of stored data; tooling requirements remain in AGENTS.md until the owner changes them.
