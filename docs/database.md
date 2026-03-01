# Database

SQLite via better-sqlite3. Database file lives at `~/Library/Application Support/tweebs/tweebs.db`.

## Schema

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  blueprint_id TEXT,
  project_path TEXT NOT NULL,   -- ~/tweebs-projects/{name}/
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed', 'archived')),
  pm_session_id TEXT,           -- Claude Code session ID for PM resumption
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE tweebs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_color TEXT NOT NULL,
  pid INTEGER,                  -- OS process ID when running
  status TEXT NOT NULL DEFAULT 'idle' CHECK(status IN ('idle', 'working', 'blocked', 'done', 'rate_limited', 'error')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assigned_tweeb_id TEXT REFERENCES tweebs(id),
  title TEXT NOT NULL,
  description TEXT,
  column_name TEXT NOT NULL DEFAULT 'backlog' CHECK(column_name IN ('backlog', 'in_progress', 'done')),
  priority INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user', 'pm')),
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

## Indexes

```sql
CREATE INDEX idx_tweebs_project ON tweebs(project_id);
CREATE INDEX idx_tickets_project ON tickets(project_id);
CREATE INDEX idx_tickets_tweeb ON tickets(assigned_tweeb_id);
CREATE INDEX idx_messages_project ON messages(project_id, created_at);
```

## Changes from initial design

- **Removed `repo_url` and `repo_local_path` from tweebs table**: All Tweebs work in the same project directory. No per-Tweeb repos.
- **Removed `backend` from tweebs table**: V1 is Claude-only. Backend choice is project-level (and there's only one option).
- **Removed `system_prompt_path` from tweebs table**: Derived from role — `prompts/{role}.md`. No need to store it.
- **Added `pm_session_id` to projects table**: Needed for Claude Code `--resume` to maintain PM conversation across sessions.
- **Added `project_path` to projects table**: Local filesystem path to the project directory.

## Settings Keys

| Key | Value | Purpose |
|-----|-------|---------|
| `username` | string | TWEEBS display name |
| `permissions_accepted` | `true`/`false` | Disclaimer accepted |
| `onboarding_complete` | `true`/`false` | First-run setup finished |
| `notification_enabled` | `true`/`false` | macOS notifications |

Removed from initial design:
- `tweeber_github` — no GitHub accounts
- `backend` — V1 is Claude-only
- `phone_number` — SMS is V2
- `voice_enabled` — TTS is V2

## Migration Strategy

V1 uses a single migration that creates all tables. Future versions:
1. Check a `schema_version` in settings table
2. Run migrations sequentially from current version
3. Migrations are plain SQL files in `src/main/db/migrations/`
4. Run inside a transaction — if any step fails, rollback

## Data Lifecycle

- Projects can be archived (not deleted) — preserves history
- When a project is archived: kill all Tweeb processes, keep all data
- SQLite file can be backed up by copying the single `.db` file
- No data leaves the machine
- Project source code lives at `~/tweebs-projects/{name}/`, database metadata lives in the app's SQLite
