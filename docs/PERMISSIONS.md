# Permissions & RBAC

## Model

Role + Scope. Permission checks use capabilities, never role names directly.

```
has_capability(user, "finance.view_giving", branch=branch_obj)
```

## Roles (seeded as fixtures)

| Role | Scope | Description |
|------|-------|-------------|
| `network_admin` | All branches | All capabilities everywhere |
| `branch_admin` | Own branch | All branch-scoped capabilities |
| `pastor` | Own branch | Member + attendance; no finance |
| `finance` | Own branch | Finance capabilities only |
| `group_leader` | Own group | Limited member view (their group) |
| `member` | Self | Self-service only |

## Capability examples

`members.view`, `members.create`, `members.edit_pastoral_notes`, `members.view_sensitive`, `finance.view_giving`, `finance.record_giving`, `finance.view_reports`, `attendance.record`, `events.create`

## Implementation (Phase 1)

- `Role`, `Capability`, `RoleCapability`, `UserRoleAssignment` (User × Role × Branch) in `apps.accounts` (or dedicated `apps.rbac` — TBD).
- `has_capability(user, capability, branch=None)` helper.
- `HasCapability("members.view")` DRF permission class.
- A user may hold different roles across different branches.

## Postgres Row-Level Security (RLS)

RLS is a safety net; application code is the primary enforcement layer.

Planned policies (to be implemented in Phase 1):
- Authenticated DB role: `chms_app`
- Policy on branch-scoped tables: `USING (branch_id = current_setting('app.branch_id')::int OR current_setting('app.is_network_admin')::bool)`
- Set `app.branch_id` and `app.is_network_admin` at the start of each DB session via Django middleware.
