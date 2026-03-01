// === PM Command Protocol ===
export type PMCommand =
  | { cmd: 'create_ticket'; title: string; description: string; assignTo: string; dependsOn?: string[] }
  | { cmd: 'move_ticket'; ticketId: string; column: 'backlog' | 'in_progress' | 'done' }
  | { cmd: 'spawn_worker'; role: string; task: { title: string; description: string; acceptanceCriteria: string[] } }
  | { cmd: 'kill_worker'; tweebId: string }
  | { cmd: 'message_user'; content: string }
  | { cmd: 'request_decision'; question: string; options: string[] }
  | { cmd: 'mark_complete'; summary: string }

// === Agent Engine ===
export interface AgentConfig {
  workingDir: string
  systemPrompt: string
  model?: string
  sessionId?: string
}

export interface StreamMessage {
  type: 'text' | 'tool_use' | 'tool_result' | 'error' | 'system'
  content: string
  timestamp: number
}

// === Database Models ===
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived'
export type TweebStatus = 'idle' | 'working' | 'blocked' | 'done' | 'rate_limited' | 'error'
export type TicketColumn = 'backlog' | 'in_progress' | 'done'
export type MessageRole = 'user' | 'pm'
export type CardState = 'queued' | 'starting' | 'working' | 'rate_limited' | 'blocked' | 'done' | 'error'

export interface Project {
  id: string
  name: string
  description: string | null
  blueprint_id: string | null
  project_path: string
  status: ProjectStatus
  pm_session_id: string | null
  created_at: number
  updated_at: number
}

export interface Tweeb {
  id: string
  project_id: string
  role: string
  display_name: string
  avatar_color: string
  pid: number | null
  status: TweebStatus
  created_at: number
  updated_at: number
}

export interface Ticket {
  id: string
  project_id: string
  assigned_tweeb_id: string | null
  title: string
  description: string | null
  column_name: TicketColumn
  priority: number
  created_at: number
  updated_at: number
}

export interface Message {
  id: string
  project_id: string
  role: MessageRole
  content: string
  created_at: number
}

// === IPC Events (main -> renderer) ===
export type IPCEvent =
  | { type: 'chat:message'; message: Message }
  | { type: 'board:update'; tickets: Ticket[] }
  | { type: 'tweeb:status'; tweeb: Tweeb }
  | { type: 'project:status'; projectId: string; status: ProjectStatus }
  | { type: 'decision:request'; question: string; options: string[] }

// === IPC Handlers (renderer -> main) ===
export interface IPCHandlers {
  'chat:send': (projectId: string, message: string) => Promise<void>
  'project:create': (name: string, description: string, blueprintId: string) => Promise<Project>
  'project:list': () => Promise<Project[]>
  'project:get': (id: string) => Promise<{ project: Project; tickets: Ticket[]; messages: Message[]; tweebs: Tweeb[] }>
  'onboard:check': () => Promise<{ step: string; details: Record<string, boolean> }>
  'onboard:install': (target: string) => Promise<{ success: boolean; error?: string }>
  'settings:get': (key: string) => Promise<string | null>
  'settings:set': (key: string, value: string) => Promise<void>
  'decision:respond': (projectId: string, choice: string) => Promise<void>
  'blueprint:list': () => Promise<BlueprintInfo[]>
}

// === Blueprint Types ===
export interface BlueprintInfo {
  id: string
  name: string
  description: string
  icon: string
}
