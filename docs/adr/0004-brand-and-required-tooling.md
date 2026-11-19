# ADR 0004: Brand and required verification tooling

- Date: 2026-10-28
- Status: Historical decision. NextSignal is the current spelling.
- Owner: Project owner

## Decision

This decision confirmed the product name and retained the existing PNG wordmarks without selecting a new visual system. Current spelling follows those wordmarks, **NextSignal**, with `@nextsignal` workspace packages. [Database naming cutover](../operations/DATABASE_NAMING_CUTOVER.md)

The owner has installed Docker Desktop. Check CLI and daemon readiness separately. At this task's initial check, the CLI was present but docker info could not connect to the Docker Desktop Linux engine. No Docker-dependent test was run or claimed successful.

When a required tool is missing or not running, report the tool and affected verification gate to the owner. Do not work around the tool with a substitute environment and count that as passing the original gate. PGlite remains the existing local M1 fixture runtime, not a replacement for native PostgreSQL/Supabase verification. Starting the existing fixture does not change database architecture or close any native database release gate.

## Security, cost and rollback

Real APIs, payments and deployment remain disabled. No Docker images or new tools are installed by this task. No customer data migration, production infrastructure change or legal/trademark clearance is implied. The display name can be reverted independently of stored data; tooling requirements remain in AGENTS.md until the owner changes them.
