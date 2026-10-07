# Security Notes

- Enforce least privilege.
- Evaluate role plus scope on every backend request.
- Encrypt data in transit.
- Prefer secure platform storage for tokens; avoid persisting long-lived secrets in local storage.
- Treat barcode content as untrusted input.
- Validate all identifiers server-side.
- Record administrative and high-risk asset actions in audit logs.
- Require explicit confirmation for irreversible retirement/disposal steps.
