# Data Model

_This document is updated whenever the schema changes. See migration files for the authoritative SQL._

## Phase 1 (current)

### accounts.User
| Field | Type | Notes |
|-------|------|-------|
| `email` | EmailField unique | Login field |
| `phone` | CharField | Optional |
| `full_name` | CharField | |
| `is_active` | BooleanField | |
| `is_staff` | BooleanField | Django admin access |
| `is_network_admin` | BooleanField | Bypasses branch scoping |
| `last_login_branch` | FK → Branch | Added in branches migration |
| `date_joined` | DateTimeField | auto_now_add |
| `deleted_at` | DateTimeField | Soft delete; null = active |

### core.BranchScopedModel (abstract)
| Field | Type | Notes |
|-------|------|-------|
| `created_at` | DateTimeField | auto_now_add |
| `updated_at` | DateTimeField | auto_now |
| `deleted_at` | DateTimeField | Soft delete |
| `branch` | FK → Branch | Added by concrete model migration |

### branches.Branch _(Phase 1 — model TBD)_
Fields: `name`, `slug`, `code`, `address`, `city`, `region`, `country`, `phone`, `email`, `timezone`, `currency`, `is_active`, `parent_branch`.

### branches.BranchMembership _(Phase 1)_
Join table: `Member × Branch` with `joined_at`, `left_at`, `is_primary`, `transfer_reason`.

### members.Member _(Phase 1)_
Separate model with optional `user` FK. Fields: `first_name`, `middle_name`, `last_name`, `gender`, `date_of_birth`, `marital_status`, `occupation`, `phone`, `email`, `address`, `photo`, `household`, `membership_status`, `date_joined`, `baptism_date`, `baptism_status`, `notes`, `sensitive_notes` (encrypted).

### members.Household _(Phase 1)_
Fields: `head_of_household`, `address`, `phone`.

### attendance.AttendanceEvent _(Phase 1)_
Fields: `date`, `branch`, `service_type`, `expected_count`.

### attendance.AttendanceRecord _(Phase 1)_
Fields: `member` (nullable for headcount), `event`, `present`, `late`, `notes`.

## Phase 2 (Finance) — not yet implemented

`Fund`, `GivingCategory`, `Pledge`, `Contribution` (append-only), `Receipt`, `FinancialPeriod`.

## Phase 3–4 — stubs planned

See `PROJECT_SPEC.md §5` for the full field list.
