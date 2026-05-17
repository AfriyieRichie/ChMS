# Architecture

## Overview

Single-database, shared-schema multi-tenant system. One Django project, one Postgres database, one deployment. Branch isolation is enforced at the application layer with Postgres RLS as a safety net.

## Branch scoping

Every branch-scoped model inherits `BranchScopedModel` (abstract, in `apps.core`). The `branch` FK is added by each concrete model's migration. The `BranchScopedViewSet` base class injects `filter(branch=request_branch)` into every queryset automatically.

Network admins (`User.is_network_admin=True`) bypass the filter and may pass `?branch=<id>` or `?branch=all`.

## Auth flow

1. Client POSTs credentials to `/api/v1/auth/token/` → receives `access` (15 min) + `refresh` (7 days, HttpOnly cookie).
2. All subsequent requests carry `Authorization: Bearer <access>`.
3. On 401, the web client silently POSTs to `/api/v1/auth/token/refresh/` using the cookie.
4. Refresh rotation is enabled: each refresh issues a new refresh token and blacklists the old one.

## Module boundaries

| App | Responsibility |
|-----|---------------|
| `core` | Abstract base models, health check, custom exception handler |
| `accounts` | Custom `User` model, JWT configuration |
| `branches` | `Branch` model, `BranchMembership` join table |
| `members` | `Member`, `Household` |
| `attendance` | `AttendanceEvent`, `AttendanceRecord` |
| `finance` | `Fund`, `GivingCategory`, `Pledge`, `Contribution`, `Receipt`, `FinancialPeriod` |
| `events` | `Event`, `ServicePlan` |
| `groups` | `Group`, `GroupMembership`, `DiscipleshipPath` |
| `communications` | `MessageTemplate`, `Audience`, `MessageCampaign` (stubs, no provider) |

## Decisions log

- **Custom User model (`accounts.User`):** Set up before any migrations; email is the login field. Avoids the impossible-to-reverse default auth.User change.
- **Separate `Member` model (not extending User):** Most members won't have logins on day one. The optional `user` FK on `Member` is added when a member self-registers.
- **Append-only Contributions:** Corrections via reversal entries. Finance needs an audit trail; in-place edits destroy it.
- **Single Postgres DB:** No sharding. Large churches rarely exceed 50k rows; PostgreSQL handles this trivially.
