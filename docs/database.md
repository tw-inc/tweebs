# Database

SQLite via better-sqlite3. Database file lives at `~/Library/Application Support/tweebs/tweebs.db`.

## Schema

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  blueprint_id TEXT,
  backend TEXT NOT NULL CHECK(backend IN ('claude', 'codex')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed', 'archived')),
  github_org TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE tweebs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_color TEXT NOT NULL,
  system_prompt_path TEXT NOT NULL,
  repo_url TEXT,
  repo_local_path TEXT,
  pid INTEGER,
  status TEXT NOT NULL DEFAULT 'idle' CHECK(status IN ('idle', 'working', 'paused', 'blocked', 'done', 'rate_limited', 'error')),
  backend TEXT NOT NULL CHECK(backend IN ('claude', 'codex')),
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

## Settings Keys

| Key | Value | Purpose |
|-----|-------|---------|
| `username` | string | TWEEBS username |
| `tweeber_github` | string | `{username}-tweeber` GitHub account/org |
| `backend` | `claude` or `codex` | Default LLM backend |
| `permissions_accepted` | `true`/`false` | --dangerously-skip-permissions disclaimer |
| `phone_number` | string | For SMS notifications (optional) |
| `onboarding_complete` | `true`/`false` | Whether first-run setup finished |
| `voice_enabled` | `true`/`false` | TTS for PM messages |

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
- No data leaves the machine in V1
