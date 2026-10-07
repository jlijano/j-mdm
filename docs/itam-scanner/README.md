# ITAM Scanner Documentation Package

This repository-ready documentation defines the mobile-first IT Asset Management (ITAM) scanner application: user flows, screens, data model, API contracts, RBAC, offline synchronization, audit logging, accessibility, and image-reference placeholders.

## Intended use
- Product and UX reference for implementation
- Engineering handoff for frontend, backend, QA, and security
- Basis for sprint planning and acceptance criteria
- Source of truth for mobile scanner behavior

## Documentation map
- `docs/01-product-overview.md` — scope, goals, terminology, system boundaries
- `docs/02-mobile-workflows.md` — end-to-end mobile scanning workflows
- `docs/03-screen-requirements.md` — screen-by-screen UI/UX requirements
- `docs/04-data-model.md` — core entities, relationships, validation rules
- `docs/05-api-contracts.md` — API behavior, payloads, errors, idempotency
- `docs/06-rbac.md` — roles, permissions, scope, approval boundaries
- `docs/07-offline-sync.md` — offline queueing, conflict resolution, retry behavior
- `docs/08-audit-logging.md` — auditable events, log schema, retention guidance
- `docs/09-accessibility.md` — WCAG-oriented mobile accessibility guidance
- `docs/10-nonfunctional-requirements.md` — performance, security, observability, privacy
- `docs/11-acceptance-criteria.md` — functional acceptance criteria and QA checklist
- `docs/reference-images/` — image placeholders and visual-reference manifest
- `api/openapi.yaml` — starter OpenAPI contract
- `database/schema.sql` — starter relational schema

## Product principle
The scanner is not a standalone barcode reader. It is an **ITAM inventory, verification, custody, location, and lifecycle action workspace** with auditable outcomes.
