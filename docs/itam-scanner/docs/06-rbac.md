# 06 — RBAC Rules

## 1. Supported system roles
- Super Admin
- IT Administrator
- ITAM / Asset Manager
- Security
- Service Desk / Technician

## 2. Scope model
Permissions are evaluated together with data scope:
- Enterprise-wide
- Business Unit
- Site
- Department
- Team
- Self-only

Effective access = role permissions ∩ assigned scope ∩ asset sensitivity policy.

## 3. Permission matrix

| Capability | Super Admin | IT Administrator | ITAM / Asset Manager | Security | Service Desk / Technician |
|---|---:|---:|---:|---:|---:|
| Scan / lookup asset | Yes | Yes | Yes | Yes | Yes |
| Start inventory session | Yes | Yes | Yes | Optional | Limited |
| Verify asset | Yes | Yes | Yes | Yes | Yes |
| Register asset | Yes | Yes | Yes | No | Limited/No |
| Edit core asset data | Yes | Yes | Yes | No | Limited |
| Assign / return asset | Yes | Yes | Yes | View | Yes within scope |
| Move asset location | Yes | Yes | Yes | View | Limited |
| View financial data | Yes | Policy | Yes | No | No |
| Change depreciation | Yes | No/Policy | Yes | No | No |
| Retire / dispose asset | Yes | Policy | Yes | No | No |
| View audit logs | Yes | Yes | Yes | Yes | Limited |
| Manage users | Yes | Limited/Policy | No | No | No |
| Manage roles/permissions | Yes | No | No | No | No |
| View location history | Yes | Yes | Yes | Yes | Limited |
| Export inventory | Yes | Yes | Yes | Policy | Limited |
| Resolve exceptions | Yes | Yes | Yes | Security-only exceptions | Limited |

## 4. Sensitive field rules
Financial fields, security classifications, precise device location, and audit details may require separate permissions even if the user can view the asset.

## 5. UI behavior
- Do not render actions the user cannot perform.
- Show a clear read-only state where viewing is allowed but mutation is not.
- Never rely on hidden UI as the security boundary.
