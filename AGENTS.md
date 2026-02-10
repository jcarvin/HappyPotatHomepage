# Agent context (non-production test harness)

This repository is **not a production-ready codebase**.

## Purpose

`happyPotatHomepage` is a **test harness** used to validate and iterate on:

- HubSpot **Marketplace app installation flows**
- OAuth / auth callback behavior
- App-related integration experiments (UI + network behavior)

## Guidance for agents

- **Optimize for testability and iteration speed** over production hardening.
- **Avoid large architectural refactors** unless explicitly requested.
- **Keep changes practical for flow-testing** (e.g., clear logging, easy toggles, simple configuration).
- **Still follow basic safety hygiene**:
  - Do not add or commit secrets (tokens, private keys, real credentials).
  - Prefer environment variables for anything sensitive.

