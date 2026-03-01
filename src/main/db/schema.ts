export const SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  blueprint_id TEXT,
  project_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  pm_session_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tweebs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  role TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_color TEXT NOT NULL,
  pid INTEGER,
  status TEXT NOT NULL DEFAULT 'idle',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  assigned_tweeb_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  column_name TEXT NOT NULL DEFAULT 'backlog',
  priority INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (assigned_tweeb_id) REFERENCES tweebs(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tweebs_project ON tweebs(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_project ON tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(project_id, created_at);
`
