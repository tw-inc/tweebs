# TWEEBS Technical Implementation Specification

Self-contained implementation spec. Every type, every IPC channel, every function signature, every config file. This document is the contract. Build against it.

---

## 1. SHARED TYPES (`src/shared/types.ts`)

```typescript
// =============================================================================
// ENUMS
// =============================================================================

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';

export type TweebStatus = 'idle' | 'working' | 'blocked' | 'done' | 'rate_limited' | 'error';

export type TicketColumn = 'backlog' | 'in_progress' | 'done';

export type MessageRole = 'user' | 'pm';

export type TweebRole =
  | 'pm'
  | 'architect'
  | 'ux-designer'
  | 'frontend-engineer'
  | 'backend-engineer'
  | 'mobile-engineer'
  | 'qa-engineer'
  | 'sdet';

export type TweebAvatarColor =
  | 'blue'     // PM
  | 'teal'     // Architect
  | 'purple'   // Designer
  | 'green'    // Frontend
  | 'yellow'   // Backend
  | 'red'      // Mobile
  | 'orange'   // QA
  | 'pink';    // SDET

export type CardState =
  | 'queued'
  | 'starting'
  | 'working'
  | 'rate_limited'
  | 'blocked'
  | 'done'
  | 'error';

export type SubscriptionTier = '$20' | '$100';

// =============================================================================
// DATABASE ROW TYPES
// =============================================================================

export interface Project {
  id: string;
  name: string;
  description: string | null;
  blueprint_id: string | null;
  project_path: string;
  status: ProjectStatus;
  pm_session_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface Tweeb {
  id: string;
  project_id: string;
  role: TweebRole;
  display_name: string;
  avatar_color: TweebAvatarColor;
  pid: number | null;
  status: TweebStatus;
  created_at: number;
  updated_at: number;
}

export interface Ticket {
  id: string;
  project_id: string;
  assigned_tweeb_id: string | null;
  title: string;
  description: string | null;
  column_name: TicketColumn;
  priority: number;
  created_at: number;
  updated_at: number;
}

export interface Message {
  id: string;
  project_id: string;
  role: MessageRole;
  content: string;
  created_at: number;
}

export interface Setting {
  key: string;
  value: string;
}

// =============================================================================
// PM COMMAND PROTOCOL
// =============================================================================

export type PMCommand =
  | PMCreateTicketCommand
  | PMMoveTicketCommand
  | PMSpawnWorkerCommand
  | PMKillWorkerCommand
  | PMMessageUserCommand
  | PMRequestDecisionCommand
  | PMMarkCompleteCommand;

export interface PMCreateTicketCommand {
  cmd: 'create_ticket';
  title: string;
  description: string;
  assignTo: TweebRole;
  dependsOn?: string[];
}

export interface PMMoveTicketCommand {
  cmd: 'move_ticket';
  ticketId: string;
  column: TicketColumn;
}

export interface PMSpawnWorkerCommand {
  cmd: 'spawn_worker';
  role: TweebRole;
  task: {
    title: string;
    description: string;
    acceptanceCriteria: string[];
  };
}

export interface PMKillWorkerCommand {
  cmd: 'kill_worker';
  tweebId: string;
}

export interface PMMessageUserCommand {
  cmd: 'message_user';
  content: string;
}

export interface PMRequestDecisionCommand {
  cmd: 'request_decision';
  question: string;
  options: string[];
}

export interface PMMarkCompleteCommand {
  cmd: 'mark_complete';
  summary: string;
}

// =============================================================================
// STREAM MESSAGE (from Claude Code NDJSON)
// =============================================================================

export type StreamMessageType = 'text' | 'tool_use' | 'tool_result' | 'error' | 'system';

export interface StreamMessage {
  type: StreamMessageType;
  content: string;
  timestamp: number;
}

// =============================================================================
// AGENT ENGINE TYPES
// =============================================================================

export interface AgentConfig {
  workingDir: string;
  systemPrompt: string;
  model?: string;
  sessionId?: string;
}

export interface AgentProcessInfo {
  id: string;
  pid: number;
  role: TweebRole;
  status: TweebStatus;
  projectId: string;
}

// =============================================================================
// BLUEPRINT TYPES
// =============================================================================

export interface Blueprint {
  id: string;
  name: string;
  description: string;
  icon: string;
  dependencies: BlueprintDependencies;
  authRequirements: BlueprintAuthRequirement[];
  mcpConfigs: BlueprintMCPConfig[];
  tweebRoles: TweebRole[];
  scaffolding: BlueprintScaffolding;
  ticketTemplate: BlueprintTicketTemplate[];
}

export interface BlueprintDependencies {
  universal: { list: string[] };
  blueprint: BlueprintDependency[];
}

export interface BlueprintDependency {
  name: string;
  check: string;
  versionCheck: string;
  minVersion?: string;
  install: string | null;
  blocker: boolean;
  blockerMessage?: string;
  blockerLink?: string;
}

export interface BlueprintAuthRequirement {
  name: string;
  required: boolean;
  note: string;
  enrollUrl: string;
  authFlow: string[];
}

export interface BlueprintMCPConfig {
  name: string;
  package: string;
  transport: 'stdio' | 'sse';
  assignTo: TweebRole[];
  userNotice?: string;
}

export interface BlueprintScaffolding {
  stack: string;
  commands: string[];
  postScaffold: string[];
}

export interface BlueprintTicketTemplate {
  title: string;
  description: string;
  assignTo: TweebRole;
  dependsOn?: string[];
  priority: number;
}

// =============================================================================
// ONBOARDING TYPES
// =============================================================================

export type OnboardingStep = 'welcome' | 'subscription' | 'install' | 'auth' | 'disclaimer' | 'ready';

export interface OnboardingState {
  currentStep: OnboardingStep;
  username: string;
  subscriptionTier: SubscriptionTier | null;
  installProgress: DependencyStatus[];
  authStatus: AuthStatus;
  permissionsAccepted: boolean;
}

export type DependencyName = 'homebrew' | 'node' | 'git' | 'claude-code';

export interface DependencyStatus {
  name: DependencyName;
  displayName: string;
  status: 'checking' | 'installed' | 'installing' | 'failed' | 'not_installed';
  version?: string;
  error?: string;
}

export type AuthStatus = 'unchecked' | 'checking' | 'not_authenticated' | 'authenticating' | 'authenticated' | 'failed';

export interface PasswordPrompt {
  processName: string;
  message: string;
}

// =============================================================================
// SETTINGS TYPES
// =============================================================================

export interface AppSettings {
  username: string;
  permissions_accepted: boolean;
  onboarding_complete: boolean;
  notification_enabled: boolean;
}

export type SettingsKey = keyof AppSettings;

// =============================================================================
// PROGRESS FILE TYPES (on-disk JSON)
// =============================================================================

export interface ProgressFile {
  tweebId: string;
  role: TweebRole;
  status: 'working' | 'blocked' | 'done' | 'rate_limited' | 'error';
  currentTask: string;
  summary: string;
  completedTasks: string[];
  blockers: ProgressBlocker[];
  lastCommit: string | null;
  lastUpdate: number;
}

export interface ProgressBlocker {
  type: 'decision_needed' | 'dependency_missing' | 'error';
  question: string;
  options?: string[];
  context: string;
}

// =============================================================================
// TASK FILE TYPES (on-disk JSON)
// =============================================================================

export interface TaskFile {
  taskId: string;
  tweebId: string;
  role: TweebRole;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  context: {
    relevantFiles: string[];
    artifacts: string[];
  };
  status: 'assigned' | 'in_progress' | 'done';
  assignedAt: number;
}

// =============================================================================
// RATE LIMIT TYPES
// =============================================================================

export interface RateBudget {
  estimatedMessagesPerTweeb: number;
  activeTweebs: number;
  subscriptionLimit: number;
  windowMinutes: number;
  willHitLimit: boolean;
  estimatedCompletionTime: string;
}

// =============================================================================
// IPC PAYLOAD TYPES
// =============================================================================

// -- Chat IPC --

export interface ChatSendPayload {
  projectId: string;
  content: string;
}

export interface ChatMessagePayload {
  projectId: string;
  message: Message;
}

export interface ChatStreamTokenPayload {
  projectId: string;
  token: string;
  isComplete: boolean;
}

export interface ChatHistoryRequest {
  projectId: string;
}

export type ChatHistoryResponse = Message[];

// -- Board IPC --

export interface BoardUpdatePayload {
  projectId: string;
  tickets: Ticket[];
  tweebs: Tweeb[];
}

export interface BoardGetRequest {
  projectId: string;
}

export interface BoardGetResponse {
  tickets: Ticket[];
  tweebs: Tweeb[];
}

// -- Project IPC --

export interface ProjectCreateRequest {
  name: string;
  description: string;
  blueprintId?: string;
}

export interface ProjectCreateResponse {
  project: Project;
}

export type ProjectListResponse = Project[];

export interface ProjectGetRequest {
  projectId: string;
}

export type ProjectGetResponse = Project | null;

export interface ProjectDeleteRequest {
  projectId: string;
}

// -- Onboarding IPC --

export type OnboardingCheckResponse = DependencyStatus[];

export interface OnboardingInstallRequest {
  dependency: DependencyName;
}

export interface OnboardingInstallProgressPayload {
  dependency: DependencyName;
  status: DependencyStatus['status'];
  message?: string;
}

export interface OnboardingPasswordRequest {
  prompt: PasswordPrompt;
}

export interface OnboardingPasswordResponse {
  password: string;
}

export interface OnboardingAuthStartResponse {
  authUrl?: string;
}

export type OnboardingAuthStatusResponse = AuthStatus;

// -- Agent IPC --

export interface AgentSpawnRequest {
  projectId: string;
  role: TweebRole;
  task?: {
    title: string;
    description: string;
    acceptanceCriteria: string[];
  };
}

export interface AgentSpawnResponse {
  tweebId: string;
  pid: number;
}

export interface AgentSendRequest {
  tweebId: string;
  message: string;
}

export interface AgentKillRequest {
  tweebId: string;
}

export interface AgentStatusPayload {
  tweebId: string;
  status: TweebStatus;
  summary?: string;
}

// -- Settings IPC --

export type SettingsGetResponse = AppSettings;

export interface SettingsSetRequest {
  key: SettingsKey;
  value: string;
}

// -- Notification IPC --

export interface NotificationSendRequest {
  title: string;
  body: string;
}

// -- Blueprint IPC --

export type BlueprintListResponse = Blueprint[];

export interface BlueprintCheckDepsRequest {
  blueprintId: string;
}

export type BlueprintCheckDepsResponse = DependencyStatus[];

// -- Decision IPC --

export interface DecisionPromptPayload {
  projectId: string;
  question: string;
  options: string[];
}

export interface DecisionResponsePayload {
  projectId: string;
  answer: string;
}

// -- Window IPC --

export interface WindowSizePayload {
  width: number;
  height: number;
}
```

---

## 2. IPC CHANNEL REGISTRY

Every IPC channel. Organized by feature area.

### Chat Channels

| Channel | Direction | Request Type | Response Type | Renderer Component/Store | Main Module |
|---------|-----------|-------------|---------------|-------------------------|-------------|
| `chat:send` | renderer->main | `ChatSendPayload` | `void` | `ChatInput` / `chatStore.sendMessage()` | `ipc/agents.ts` -> `agents/manager.ts` |
| `chat:message` | main->renderer | -- | `ChatMessagePayload` | `chatStore` listener | `agents/command-executor.ts` |
| `chat:stream-token` | main->renderer | -- | `ChatStreamTokenPayload` | `chatStore` listener | `agents/claude.ts` |
| `chat:history` | renderer->main | `ChatHistoryRequest` | `ChatHistoryResponse` | `chatStore.loadHistory()` | `ipc/agents.ts` -> `db/index.ts` |

### Board Channels

| Channel | Direction | Request Type | Response Type | Renderer Component/Store | Main Module |
|---------|-----------|-------------|---------------|-------------------------|-------------|
| `board:update` | main->renderer | -- | `BoardUpdatePayload` | `boardStore` listener | `agents/manager.ts` / progress poller |
| `board:get` | renderer->main | `BoardGetRequest` | `BoardGetResponse` | `boardStore.loadBoard()` | `ipc/agents.ts` -> `db/index.ts` |

### Project Channels

| Channel | Direction | Request Type | Response Type | Renderer Component/Store | Main Module |
|---------|-----------|-------------|---------------|-------------------------|-------------|
| `project:create` | renderer->main | `ProjectCreateRequest` | `ProjectCreateResponse` | `projectStore.createProject()` | `ipc/projects.ts` -> `db/index.ts` |
| `project:list` | renderer->main | -- | `ProjectListResponse` | `projectStore.loadProjects()` | `ipc/projects.ts` -> `db/index.ts` |
| `project:get` | renderer->main | `ProjectGetRequest` | `ProjectGetResponse` | `projectStore.selectProject()` | `ipc/projects.ts` -> `db/index.ts` |
| `project:delete` | renderer->main | `ProjectDeleteRequest` | `void` | `projectStore.deleteProject()` | `ipc/projects.ts` -> `db/index.ts` |

### Onboarding Channels

| Channel | Direction | Request Type | Response Type | Renderer Component/Store | Main Module |
|---------|-----------|-------------|---------------|-------------------------|-------------|
| `onboard:check` | renderer->main | -- | `OnboardingCheckResponse` | `appStore.checkDependencies()` | `ipc/onboarding.ts` -> `onboarding/detect.ts` |
| `onboard:install` | renderer->main | `OnboardingInstallRequest` | `void` | `appStore.installDependency()` | `ipc/onboarding.ts` -> `onboarding/install.ts` |
| `onboard:install-progress` | main->renderer | -- | `OnboardingInstallProgressPayload` | `appStore` listener | `onboarding/install.ts` |
| `onboard:password-needed` | main->renderer | -- | `OnboardingPasswordRequest` | `appStore` listener (shows dialog) | `onboarding/install.ts` |
| `onboard:password-submit` | renderer->main | `OnboardingPasswordResponse` | `void` | password dialog submit | `ipc/onboarding.ts` -> `onboarding/install.ts` |
| `onboard:auth-start` | renderer->main | -- | `OnboardingAuthStartResponse` | `appStore.startAuth()` | `ipc/onboarding.ts` -> `onboarding/install.ts` |
| `onboard:auth-status` | renderer->main | -- | `OnboardingAuthStatusResponse` | `appStore.checkAuth()` | `ipc/onboarding.ts` -> `onboarding/detect.ts` |
| `onboard:install-all` | renderer->main | -- | `void` | `appStore.installAll()` | `ipc/onboarding.ts` -> `onboarding/install.ts` |

### Agent Channels

| Channel | Direction | Request Type | Response Type | Renderer Component/Store | Main Module |
|---------|-----------|-------------|---------------|-------------------------|-------------|
| `agent:spawn` | renderer->main | `AgentSpawnRequest` | `AgentSpawnResponse` | `boardStore` (indirect, via PM command) | `ipc/agents.ts` -> `agents/manager.ts` |
| `agent:send` | renderer->main | `AgentSendRequest` | `void` | (internal, PM follow-up) | `ipc/agents.ts` -> `agents/manager.ts` |
| `agent:kill` | renderer->main | `AgentKillRequest` | `void` | (internal, cleanup) | `ipc/agents.ts` -> `agents/manager.ts` |
| `agent:status` | main->renderer | -- | `AgentStatusPayload` | `boardStore` listener | `agents/manager.ts` |

### Settings Channels

| Channel | Direction | Request Type | Response Type | Renderer Component/Store | Main Module |
|---------|-----------|-------------|---------------|-------------------------|-------------|
| `settings:get` | renderer->main | -- | `SettingsGetResponse` | `appStore.loadSettings()` | `ipc/settings.ts` -> `db/index.ts` |
| `settings:set` | renderer->main | `SettingsSetRequest` | `void` | `appStore.updateSetting()` | `ipc/settings.ts` -> `db/index.ts` |

### Notification Channels

| Channel | Direction | Request Type | Response Type | Renderer Component/Store | Main Module |
|---------|-----------|-------------|---------------|-------------------------|-------------|
| `notification:send` | (main internal) | `NotificationSendRequest` | `void` | -- | `notifications/index.ts` |

### Blueprint Channels

| Channel | Direction | Request Type | Response Type | Renderer Component/Store | Main Module |
|---------|-----------|-------------|---------------|-------------------------|-------------|
| `blueprint:list` | renderer->main | -- | `BlueprintListResponse` | `projectStore.loadBlueprints()` | `ipc/projects.ts` -> `blueprints/index.ts` |
| `blueprint:check-deps` | renderer->main | `BlueprintCheckDepsRequest` | `BlueprintCheckDepsResponse` | `projectStore` | `ipc/projects.ts` -> `onboarding/detect.ts` |

### Decision Channels

| Channel | Direction | Request Type | Response Type | Renderer Component/Store | Main Module |
|---------|-----------|-------------|---------------|-------------------------|-------------|
| `decision:prompt` | main->renderer | -- | `DecisionPromptPayload` | `chatStore` listener (shows inline buttons) | `agents/command-executor.ts` |
| `decision:respond` | renderer->main | `DecisionResponsePayload` | `void` | `ChatView` decision buttons | `ipc/agents.ts` -> `agents/manager.ts` |

---

## 3. PRELOAD API (`src/preload/index.ts`)

```typescript
import { contextBridge, ipcRenderer } from 'electron';
import type {
  ChatSendPayload,
  ChatMessagePayload,
  ChatStreamTokenPayload,
  ChatHistoryRequest,
  ChatHistoryResponse,
  BoardUpdatePayload,
  BoardGetRequest,
  BoardGetResponse,
  ProjectCreateRequest,
  ProjectCreateResponse,
  ProjectListResponse,
  ProjectGetRequest,
  ProjectGetResponse,
  ProjectDeleteRequest,
  OnboardingCheckResponse,
  OnboardingInstallRequest,
  OnboardingInstallProgressPayload,
  OnboardingPasswordRequest,
  OnboardingPasswordResponse,
  OnboardingAuthStartResponse,
  OnboardingAuthStatusResponse,
  AgentStatusPayload,
  SettingsGetResponse,
  SettingsSetRequest,
  BlueprintListResponse,
  BlueprintCheckDepsRequest,
  BlueprintCheckDepsResponse,
  DecisionPromptPayload,
  DecisionResponsePayload,
} from '../shared/types';

type UnsubscribeFn = () => void;

const api = {
  // ---- Chat ----
  chat: {
    send: (payload: ChatSendPayload): Promise<void> =>
      ipcRenderer.invoke('chat:send', payload),

    onMessage: (cb: (payload: ChatMessagePayload) => void): UnsubscribeFn => {
      const handler = (_event: Electron.IpcRendererEvent, payload: ChatMessagePayload) => cb(payload);
      ipcRenderer.on('chat:message', handler);
      return () => ipcRenderer.removeListener('chat:message', handler);
    },

    onStreamToken: (cb: (payload: ChatStreamTokenPayload) => void): UnsubscribeFn => {
      const handler = (_event: Electron.IpcRendererEvent, payload: ChatStreamTokenPayload) => cb(payload);
      ipcRenderer.on('chat:stream-token', handler);
      return () => ipcRenderer.removeListener('chat:stream-token', handler);
    },

    getHistory: (payload: ChatHistoryRequest): Promise<ChatHistoryResponse> =>
      ipcRenderer.invoke('chat:history', payload),
  },

  // ---- Board ----
  board: {
    get: (payload: BoardGetRequest): Promise<BoardGetResponse> =>
      ipcRenderer.invoke('board:get', payload),

    onUpdate: (cb: (payload: BoardUpdatePayload) => void): UnsubscribeFn => {
      const handler = (_event: Electron.IpcRendererEvent, payload: BoardUpdatePayload) => cb(payload);
      ipcRenderer.on('board:update', handler);
      return () => ipcRenderer.removeListener('board:update', handler);
    },
  },

  // ---- Projects ----
  projects: {
    create: (payload: ProjectCreateRequest): Promise<ProjectCreateResponse> =>
      ipcRenderer.invoke('project:create', payload),

    list: (): Promise<ProjectListResponse> =>
      ipcRenderer.invoke('project:list'),

    get: (payload: ProjectGetRequest): Promise<ProjectGetResponse> =>
      ipcRenderer.invoke('project:get', payload),

    delete: (payload: ProjectDeleteRequest): Promise<void> =>
      ipcRenderer.invoke('project:delete', payload),
  },

  // ---- Onboarding ----
  onboarding: {
    check: (): Promise<OnboardingCheckResponse> =>
      ipcRenderer.invoke('onboard:check'),

    install: (payload: OnboardingInstallRequest): Promise<void> =>
      ipcRenderer.invoke('onboard:install', payload),

    installAll: (): Promise<void> =>
      ipcRenderer.invoke('onboard:install-all'),

    onInstallProgress: (cb: (payload: OnboardingInstallProgressPayload) => void): UnsubscribeFn => {
      const handler = (_event: Electron.IpcRendererEvent, payload: OnboardingInstallProgressPayload) => cb(payload);
      ipcRenderer.on('onboard:install-progress', handler);
      return () => ipcRenderer.removeListener('onboard:install-progress', handler);
    },

    onPasswordNeeded: (cb: (payload: OnboardingPasswordRequest) => void): UnsubscribeFn => {
      const handler = (_event: Electron.IpcRendererEvent, payload: OnboardingPasswordRequest) => cb(payload);
      ipcRenderer.on('onboard:password-needed', handler);
      return () => ipcRenderer.removeListener('onboard:password-needed', handler);
    },

    submitPassword: (payload: OnboardingPasswordResponse): Promise<void> =>
      ipcRenderer.invoke('onboard:password-submit', payload),

    startAuth: (): Promise<OnboardingAuthStartResponse> =>
      ipcRenderer.invoke('onboard:auth-start'),

    checkAuth: (): Promise<OnboardingAuthStatusResponse> =>
      ipcRenderer.invoke('onboard:auth-status'),
  },

  // ---- Agents ----
  agents: {
    onStatus: (cb: (payload: AgentStatusPayload) => void): UnsubscribeFn => {
      const handler = (_event: Electron.IpcRendererEvent, payload: AgentStatusPayload) => cb(payload);
      ipcRenderer.on('agent:status', handler);
      return () => ipcRenderer.removeListener('agent:status', handler);
    },
  },

  // ---- Settings ----
  settings: {
    get: (): Promise<SettingsGetResponse> =>
      ipcRenderer.invoke('settings:get'),

    set: (payload: SettingsSetRequest): Promise<void> =>
      ipcRenderer.invoke('settings:set', payload),
  },

  // ---- Blueprints ----
  blueprints: {
    list: (): Promise<BlueprintListResponse> =>
      ipcRenderer.invoke('blueprint:list'),

    checkDeps: (payload: BlueprintCheckDepsRequest): Promise<BlueprintCheckDepsResponse> =>
      ipcRenderer.invoke('blueprint:check-deps', payload),
  },

  // ---- Decisions ----
  decisions: {
    onPrompt: (cb: (payload: DecisionPromptPayload) => void): UnsubscribeFn => {
      const handler = (_event: Electron.IpcRendererEvent, payload: DecisionPromptPayload) => cb(payload);
      ipcRenderer.on('decision:prompt', handler);
      return () => ipcRenderer.removeListener('decision:prompt', handler);
    },

    respond: (payload: DecisionResponsePayload): Promise<void> =>
      ipcRenderer.invoke('decision:respond', payload),
  },
};

export type TweebsAPI = typeof api;

contextBridge.exposeInMainWorld('tweebsAPI', api);
```

**Renderer global type declaration** (`src/renderer/env.d.ts`):

```typescript
import type { TweebsAPI } from '../preload/index';

declare global {
  interface Window {
    tweebsAPI: TweebsAPI;
  }
}
```

---

## 4. REACT COMPONENT TREE

### 4.1 App Router (`src/renderer/App.tsx`)

```
App
├── OnboardingFlow          (if !onboarding_complete)
│   ├── WelcomeStep
│   ├── SubscriptionStep
│   ├── InstallStep
│   │   └── PasswordDialog  (modal, on demand)
│   ├── AuthStep
│   └── DisclaimerStep
│
├── HomeScreen              (if onboarding_complete && no project selected)
│   ├── Header
│   │   ├── Logo
│   │   ├── HelpButton      -> opens HelpPanel
│   │   └── SettingsButton   -> opens SettingsView
│   ├── ProjectGrid
│   │   ├── ProjectCard      (one per project)
│   │   └── NewProjectCard   (always last)
│   └── HelpPanel            (slide-out overlay)
│
├── ProjectView              (if project selected)
│   ├── Header
│   │   ├── BackButton       -> HomeScreen
│   │   ├── ProjectTitle
│   │   ├── HelpButton
│   │   └── SettingsButton
│   ├── ChatPanel
│   │   ├── MessageList
│   │   │   ├── MessageBubble (per message)
│   │   │   ├── StreamingBubble (live PM response)
│   │   │   ├── DecisionPrompt (inline, when active)
│   │   │   └── PreviewButton (when project complete)
│   │   └── ChatInput
│   │       ├── TextInput
│   │       └── SendButton
│   └── BoardPanel
│       ├── Column (backlog)
│       │   └── Card (per ticket)
│       ├── Column (in_progress)
│       │   └── Card (per ticket)
│       └── Column (done)
│           └── Card (per ticket)
│
└── SettingsView              (overlay / modal)
    ├── NameSetting
    ├── AuthSetting
    ├── NotificationToggle
    └── AboutSection
```

### 4.2 Component Props Interfaces

```typescript
// --- App ---
// No props. Reads appStore for routing.

// --- Onboarding ---
interface WelcomeStepProps {
  onNext: (username: string) => void;
}

interface SubscriptionStepProps {
  onNext: (tier: SubscriptionTier) => void;
  onBack: () => void;
}

interface InstallStepProps {
  dependencies: DependencyStatus[];
  onInstallAll: () => void;
  onBack: () => void;
}

interface PasswordDialogProps {
  prompt: PasswordPrompt;
  onSubmit: (password: string) => void;
  onCancel: () => void;
  error?: string;
}

interface AuthStepProps {
  authStatus: AuthStatus;
  onStartAuth: () => void;
  onBack: () => void;
}

interface DisclaimerStepProps {
  onAccept: () => void;
  onBack: () => void;
}

// --- Home ---
interface ProjectCardProps {
  project: Project;
  onClick: (projectId: string) => void;
}

interface NewProjectCardProps {
  onClick: () => void;
}

// --- Project View ---
interface ChatPanelProps {
  projectId: string;
}

interface MessageBubbleProps {
  message: Message;
}

interface StreamingBubbleProps {
  tokens: string;
}

interface DecisionPromptProps {
  question: string;
  options: string[];
  onSelect: (answer: string) => void;
  onCustom: (answer: string) => void;
}

interface PreviewButtonProps {
  label: string;
  onClick: () => void;
}

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
}

interface BoardPanelProps {
  projectId: string;
}

interface ColumnProps {
  title: string;
  tickets: Ticket[];
  tweebs: Tweeb[];
}

interface CardProps {
  ticket: Ticket;
  tweeb: Tweeb | null;
  state: CardState;
  summary?: string;
  onClick: () => void;
}

interface CardDetailViewProps {
  ticket: Ticket;
  tweeb: Tweeb | null;
  activityLog: string[];
  onClose: () => void;
}

// --- Settings ---
interface NameSettingProps {
  value: string;
  onChange: (name: string) => void;
}

interface NotificationToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}
```

### 4.3 Component-to-Store Mapping

| Component | Store(s) | Subscriptions |
|-----------|----------|---------------|
| `App` | `appStore` | `onboardingComplete`, `currentView` |
| `WelcomeStep` | `appStore` | (writes `username` on submit) |
| `InstallStep` | `appStore` | `installProgress` |
| `AuthStep` | `appStore` | `authStatus` |
| `HomeScreen` | `projectStore` | `projects` |
| `ProjectCard` | -- | (props only) |
| `ChatPanel` | `chatStore` | `messages`, `streamingTokens`, `isStreaming`, `activeDecision` |
| `ChatInput` | `chatStore` | `isStreaming` (disable while streaming) |
| `BoardPanel` | `boardStore` | `tickets`, `tweebs` |
| `Card` | `boardStore` | (derived from tickets/tweebs via selector) |
| `SettingsView` | `appStore` | `settings` |

---

## 5. ZUSTAND STORE SHAPES

### 5.1 `appStore` (`src/renderer/stores/appStore.ts`)

```typescript
import { create } from 'zustand';
import type {
  OnboardingStep,
  SubscriptionTier,
  DependencyStatus,
  AuthStatus,
  AppSettings,
  PasswordPrompt,
  SettingsKey,
} from '../../shared/types';

type CurrentView = 'onboarding' | 'home' | 'project' | 'settings';

interface AppState {
  // --- Navigation ---
  currentView: CurrentView;
  selectedProjectId: string | null;

  // --- Onboarding ---
  onboardingStep: OnboardingStep;
  username: string;
  subscriptionTier: SubscriptionTier | null;
  installProgress: DependencyStatus[];
  authStatus: AuthStatus;
  permissionsAccepted: boolean;
  onboardingComplete: boolean;

  // --- Password dialog ---
  passwordPrompt: PasswordPrompt | null;
  passwordError: string | null;

  // --- Settings ---
  settings: AppSettings;

  // --- Actions ---
  setView: (view: CurrentView) => void;
  selectProject: (projectId: string | null) => void;

  // Onboarding actions
  setOnboardingStep: (step: OnboardingStep) => void;
  setUsername: (name: string) => void;
  setSubscriptionTier: (tier: SubscriptionTier) => void;
  checkDependencies: () => Promise<void>;
  installAll: () => Promise<void>;
  installDependency: (name: DependencyStatus['name']) => Promise<void>;
  startAuth: () => Promise<void>;
  checkAuth: () => Promise<void>;
  submitPassword: (password: string) => Promise<void>;
  acceptPermissions: () => Promise<void>;
  completeOnboarding: () => Promise<void>;

  // Settings actions
  loadSettings: () => Promise<void>;
  updateSetting: (key: SettingsKey, value: string) => Promise<void>;

  // Listeners (call once on mount)
  initListeners: () => () => void;
}
```

**IPC Feeds:**
- `onboard:install-progress` -> updates `installProgress`
- `onboard:password-needed` -> sets `passwordPrompt`

### 5.2 `chatStore` (`src/renderer/stores/chatStore.ts`)

```typescript
import { create } from 'zustand';
import type { Message, DecisionPromptPayload } from '../../shared/types';

interface ChatState {
  // --- State ---
  messages: Message[];
  streamingTokens: string;
  isStreaming: boolean;
  activeDecision: DecisionPromptPayload | null;

  // --- Actions ---
  loadHistory: (projectId: string) => Promise<void>;
  sendMessage: (projectId: string, content: string) => Promise<void>;
  respondToDecision: (projectId: string, answer: string) => Promise<void>;
  clearChat: () => void;

  // Listeners
  initListeners: () => () => void;
}
```

**IPC Feeds:**
- `chat:message` -> appends to `messages`, clears `streamingTokens`, sets `isStreaming = false`
- `chat:stream-token` -> appends to `streamingTokens`, sets `isStreaming = true`
- `decision:prompt` -> sets `activeDecision`

**Selectors:**
```typescript
// Get messages for the current project
const messages = useChatStore((s) => s.messages);
// Check if PM is currently responding
const isStreaming = useChatStore((s) => s.isStreaming);
// Get active decision prompt (null if none)
const decision = useChatStore((s) => s.activeDecision);
```

### 5.3 `boardStore` (`src/renderer/stores/boardStore.ts`)

```typescript
import { create } from 'zustand';
import type { Ticket, Tweeb, TicketColumn, CardState } from '../../shared/types';

interface BoardState {
  // --- State ---
  tickets: Ticket[];
  tweebs: Tweeb[];

  // --- Actions ---
  loadBoard: (projectId: string) => Promise<void>;
  clearBoard: () => void;

  // Listeners
  initListeners: () => () => void;
}

// --- Selectors ---

// Tickets grouped by column
export const selectTicketsByColumn = (column: TicketColumn) =>
  (state: BoardState): Ticket[] =>
    state.tickets.filter((t) => t.column_name === column);

// Find the Tweeb assigned to a ticket
export const selectTweebForTicket = (tweebId: string | null) =>
  (state: BoardState): Tweeb | null =>
    tweebId ? state.tweebs.find((t) => t.id === tweebId) ?? null : null;

// Derive card state from ticket column + tweeb status
export function deriveCardState(ticket: Ticket, tweeb: Tweeb | null): CardState {
  if (ticket.column_name === 'done') return 'done';
  if (ticket.column_name === 'backlog') return 'queued';
  if (!tweeb) return 'starting';
  switch (tweeb.status) {
    case 'working': return 'working';
    case 'rate_limited': return 'rate_limited';
    case 'blocked': return 'blocked';
    case 'error': return 'error';
    case 'idle': return 'starting';
    case 'done': return 'done';
    default: return 'working';
  }
}
```

**IPC Feeds:**
- `board:update` -> replaces `tickets` and `tweebs`
- `agent:status` -> updates matching tweeb's status in `tweebs`

### 5.4 `projectStore` (`src/renderer/stores/projectStore.ts`)

```typescript
import { create } from 'zustand';
import type { Project, Blueprint, ProjectCreateRequest } from '../../shared/types';

interface ProjectState {
  // --- State ---
  projects: Project[];
  blueprints: Blueprint[];
  isLoading: boolean;

  // --- Actions ---
  loadProjects: () => Promise<void>;
  loadBlueprints: () => Promise<void>;
  createProject: (request: ProjectCreateRequest) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
}
```

**IPC Feeds:** None (pull-based only, via invoke).

---

## 6. MAIN PROCESS MODULE APIs

### 6.1 `src/main/index.ts` (Entry Point)

```typescript
import { app, BrowserWindow } from 'electron';
import { initDatabase } from './db';
import { registerIPCHandlers } from './ipc';
import { TweebManager } from './agents/manager';

// Public API:
function createWindow(): BrowserWindow;
function handleBeforeQuit(): Promise<void>;

// Lifecycle:
// 1. app.whenReady() -> initDatabase() -> createWindow() -> registerIPCHandlers()
// 2. app.on('before-quit') -> handleBeforeQuit() (save PM session, kill workers)
// 3. app.on('window-all-closed') -> app.quit() on non-macOS
```

### 6.2 `src/main/db/index.ts` (Database)

```typescript
import Database from 'better-sqlite3';
import type {
  Project, Tweeb, Ticket, Message, AppSettings,
  ProjectStatus, TweebStatus, TicketColumn,
} from '../../shared/types';

// ---- Connection ----
export function initDatabase(): Database.Database;
export function getDatabase(): Database.Database;

// ---- Migrations ----
export function runMigrations(db: Database.Database): void;

// ---- Projects ----
export function createProject(project: Omit<Project, 'created_at' | 'updated_at'>): Project;
export function getProject(id: string): Project | null;
export function listProjects(): Project[];
export function updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'description' | 'status' | 'pm_session_id'>>): Project;
export function deleteProject(id: string): void;

// ---- Tweebs ----
export function createTweeb(tweeb: Omit<Tweeb, 'created_at' | 'updated_at'>): Tweeb;
export function getTweeb(id: string): Tweeb | null;
export function listTweebsByProject(projectId: string): Tweeb[];
export function updateTweeb(id: string, updates: Partial<Pick<Tweeb, 'pid' | 'status'>>): Tweeb;
export function deleteTweeb(id: string): void;

// ---- Tickets ----
export function createTicket(ticket: Omit<Ticket, 'created_at' | 'updated_at'>): Ticket;
export function getTicket(id: string): Ticket | null;
export function listTicketsByProject(projectId: string): Ticket[];
export function updateTicket(id: string, updates: Partial<Pick<Ticket, 'column_name' | 'assigned_tweeb_id' | 'description' | 'priority'>>): Ticket;
export function deleteTicket(id: string): void;

// ---- Messages ----
export function createMessage(message: Omit<Message, 'created_at'>): Message;
export function listMessagesByProject(projectId: string): Message[];

// ---- Settings ----
export function getSetting(key: string): string | null;
export function setSetting(key: string, value: string): void;
export function getAllSettings(): AppSettings;
```

**Dependencies:** `better-sqlite3`, `../../shared/types`

**Database path:** `~/Library/Application Support/tweebs/tweebs.db`

**Init pattern:**
```typescript
import path from 'path';
import { app } from 'electron';
import Database from 'better-sqlite3';

let db: Database.Database | null = null;

export function initDatabase(): Database.Database {
  const dbPath = path.join(app.getPath('userData'), 'tweebs.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

export function getDatabase(): Database.Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}
```

### 6.3 `src/main/agents/claude.ts` (Claude Code CLI Wrapper)

```typescript
import { ChildProcess } from 'child_process';
import type { AgentConfig, StreamMessage, PMCommand, TweebRole } from '../../shared/types';

export interface AgentProcess {
  id: string;
  pid: number;
  role: TweebRole;
  process: ChildProcess;

  send(message: string): Promise<void>;
  onMessage(cb: (msg: StreamMessage) => void): void;
  onCommand(cb: (cmd: PMCommand) => void): void;
  onError(cb: (err: Error) => void): void;
  onExit(cb: (code: number | null) => void): void;
  kill(): void;
}

// Spawn a new Claude Code CLI process
export function spawnAgent(config: AgentConfig, role: TweebRole, id: string): AgentProcess;

// Parse NDJSON line into a StreamMessage
export function parseStreamLine(line: string): StreamMessage | null;

// Extract PM commands from assistant text content
export function extractPMCommands(text: string): PMCommand[];
```

**Dependencies:** `child_process`, `../../shared/types`

### 6.4 `src/main/agents/command-executor.ts` (PM Command Executor)

```typescript
import type { PMCommand, Project } from '../../shared/types';
import type { BrowserWindow } from 'electron';

export class CommandExecutor {
  constructor(
    private project: Project,
    private window: BrowserWindow,
  );

  // Execute a single PM command
  execute(command: PMCommand): Promise<void>;

  // Individual command handlers (private, called by execute)
  private handleCreateTicket(cmd: PMCreateTicketCommand): Promise<void>;
  private handleMoveTicket(cmd: PMMoveTicketCommand): Promise<void>;
  private handleSpawnWorker(cmd: PMSpawnWorkerCommand): Promise<void>;
  private handleKillWorker(cmd: PMKillWorkerCommand): Promise<void>;
  private handleMessageUser(cmd: PMMessageUserCommand): Promise<void>;
  private handleRequestDecision(cmd: PMRequestDecisionCommand): Promise<void>;
  private handleMarkComplete(cmd: PMMarkCompleteCommand): Promise<void>;
}
```

**Dependencies:** `./manager`, `../db`, `../notifications`, `../../shared/types`, `electron`

### 6.5 `src/main/agents/manager.ts` (TweebManager)

```typescript
import type { AgentProcess } from './claude';
import type { Project, TweebRole, TweebStatus, AgentConfig } from '../../shared/types';
import type { BrowserWindow } from 'electron';

export class TweebManager {
  constructor(private window: BrowserWindow);

  // --- Process lifecycle ---
  spawnPM(project: Project): Promise<AgentProcess>;
  spawnWorker(project: Project, role: TweebRole, task: { title: string; description: string; acceptanceCriteria: string[] }): Promise<AgentProcess>;
  sendToProcess(tweebId: string, message: string): Promise<void>;
  killProcess(tweebId: string): void;
  killAllForProject(projectId: string): void;

  // --- State queries ---
  getProcess(tweebId: string): AgentProcess | null;
  getActiveProcesses(projectId: string): AgentProcess[];

  // --- Progress polling ---
  startProgressPoller(projectId: string): void;
  stopProgressPoller(projectId: string): void;

  // --- Graceful shutdown ---
  shutdownAll(): Promise<void>;

  // --- Private ---
  private processes: Map<string, AgentProcess>;
  private pollerIntervals: Map<string, NodeJS.Timeout>;
  private onWorkerExit(tweebId: string, code: number | null): void;
  private pollProgress(projectId: string): Promise<void>;
  private pushBoardUpdate(projectId: string): void;
}
```

**Dependencies:** `./claude`, `./command-executor`, `../db`, `../../shared/types`, `electron`, `fs`, `path`

### 6.6 `src/main/ipc/agents.ts`

```typescript
import { ipcMain, BrowserWindow } from 'electron';
import type { TweebManager } from '../agents/manager';

export function registerAgentHandlers(manager: TweebManager, window: BrowserWindow): void;
// Registers handlers for:
//   'chat:send'       -> manager.sendToProcess(PM tweebId, message)
//   'chat:history'    -> db.listMessagesByProject()
//   'board:get'       -> db queries for tickets + tweebs
//   'decision:respond' -> manager.sendToProcess(PM tweebId, answer)
```

### 6.7 `src/main/ipc/projects.ts`

```typescript
import { ipcMain } from 'electron';

export function registerProjectHandlers(): void;
// Registers handlers for:
//   'project:create'     -> db.createProject() + scaffold project dir + spawn PM
//   'project:list'       -> db.listProjects()
//   'project:get'        -> db.getProject()
//   'project:delete'     -> db.deleteProject() + cleanup
//   'blueprint:list'     -> blueprints.loadAll()
//   'blueprint:check-deps' -> onboarding/detect.checkBlueprintDeps()
```

### 6.8 `src/main/ipc/onboarding.ts`

```typescript
import { ipcMain, BrowserWindow } from 'electron';

export function registerOnboardingHandlers(window: BrowserWindow): void;
// Registers handlers for:
//   'onboard:check'          -> detect.checkAll()
//   'onboard:install'        -> install.installDependency()
//   'onboard:install-all'    -> install.installAll()
//   'onboard:password-submit' -> pipe to pending child process stdin
//   'onboard:auth-start'     -> install.startAuth()
//   'onboard:auth-status'    -> detect.checkAuth()
```

### 6.9 `src/main/ipc/settings.ts`

```typescript
import { ipcMain } from 'electron';

export function registerSettingsHandlers(): void;
// Registers handlers for:
//   'settings:get' -> db.getAllSettings()
//   'settings:set' -> db.setSetting()
```

### 6.10 `src/main/onboarding/detect.ts`

```typescript
import type { DependencyStatus, DependencyName, AuthStatus } from '../../shared/types';

export function checkAll(): Promise<DependencyStatus[]>;
export function checkDependency(name: DependencyName): Promise<DependencyStatus>;
export function checkAuth(): Promise<AuthStatus>;
export function checkBlueprintDeps(blueprintId: string): Promise<DependencyStatus[]>;

// Internal helpers
function runShellCheck(command: string): Promise<{ found: boolean; version?: string }>;
```

**Dependencies:** `child_process`, `../../shared/types`, `../blueprints`

### 6.11 `src/main/onboarding/install.ts`

```typescript
import { BrowserWindow } from 'electron';
import type { DependencyName } from '../../shared/types';

export class Installer {
  constructor(private window: BrowserWindow);

  installAll(): Promise<void>;
  installDependency(name: DependencyName): Promise<void>;
  startAuth(): Promise<{ authUrl?: string }>;

  // Internal
  private installHomebrew(): Promise<void>;
  private installNode(): Promise<void>;
  private installGit(): Promise<void>;
  private installClaudeCode(): Promise<void>;
  private emitProgress(name: DependencyName, status: string, message?: string): void;
  private handlePasswordPrompt(processName: string): Promise<string>;

  // State for piping passwords
  private pendingPasswordResolve: ((password: string) => void) | null;
  submitPassword(password: string): void;
}
```

**Dependencies:** `child_process`, `electron`, `../../shared/types`

### 6.12 `src/main/blueprints/index.ts`

```typescript
import type { Blueprint } from '../../shared/types';

export function loadAll(): Blueprint[];
export function loadBlueprint(id: string): Blueprint | null;
export function scaffoldProject(blueprint: Blueprint, projectPath: string, projectName: string): Promise<void>;
export function writeMCPConfig(blueprint: Blueprint, projectPath: string): Promise<void>;
```

**Dependencies:** `fs`, `path`, `child_process`, `../../shared/types`

Blueprint JSON files are loaded from the `blueprints/` directory at the repo root. At build time, they are bundled as static assets.

### 6.13 `src/main/notifications/index.ts`

```typescript
import { Notification } from 'electron';

export function sendNotification(title: string, body: string): void;
export function notifyDecisionNeeded(question: string): void;
export function notifyProjectComplete(projectName: string): void;
```

**Dependencies:** `electron`

---

## 7. AGENT ENGINE DETAIL

### 7.1 Spawning a Claude Code CLI Process

```typescript
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

function spawnClaudeProcess(config: {
  prompt: string;
  workingDir: string;
  systemPromptPath: string;
  model?: string;
  sessionId?: string;
}): ChildProcess {
  const args: string[] = [
    '-p', config.prompt,
    '--output-format', 'stream-json',
    '--dangerously-skip-permissions',
  ];

  if (config.model) {
    args.push('--model', config.model);
  }

  if (config.sessionId) {
    args.push('--resume', config.sessionId);
  }

  // System prompt passed via --system-prompt flag
  const systemPrompt = fs.readFileSync(config.systemPromptPath, 'utf-8');
  args.push('--system-prompt', systemPrompt);

  const child = spawn('claude', args, {
    cwd: config.workingDir,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      // Prevent Claude Code from trying to open interactive prompts
      CI: '1',
    },
  });

  return child;
}
```

**Key details:**
- `stdio: ['pipe', 'pipe', 'pipe']` -- full control over stdin/stdout/stderr. No terminal visible.
- `cwd` is set to the project directory so Claude Code works within the project.
- `CI=1` in env prevents interactive prompts from Claude Code.
- The `claude` binary must be on `PATH` (installed during onboarding via `npm install -g @anthropic-ai/claude-code`).

### 7.2 NDJSON Stream Parsing (Line Buffering)

```typescript
function createStreamParser(
  stdout: NodeJS.ReadableStream,
  callbacks: {
    onStreamMessage: (msg: StreamMessage) => void;
    onPMCommand: (cmd: PMCommand) => void;
    onSessionId: (sessionId: string) => void;
    onError: (err: Error) => void;
  }
): void {
  let lineBuffer = '';

  stdout.on('data', (chunk: Buffer) => {
    lineBuffer += chunk.toString('utf-8');

    // Split on newlines -- NDJSON has one JSON object per line
    const lines = lineBuffer.split('\n');

    // Keep the last (potentially incomplete) line in the buffer
    lineBuffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const parsed = JSON.parse(trimmed);
        processNDJSONObject(parsed, callbacks);
      } catch (err) {
        // Skip malformed lines. Never crash the parser.
        console.warn('[stream-parser] Malformed NDJSON line:', trimmed);
      }
    }
  });

  stdout.on('end', () => {
    // Process any remaining buffer
    if (lineBuffer.trim()) {
      try {
        const parsed = JSON.parse(lineBuffer.trim());
        processNDJSONObject(parsed, callbacks);
      } catch {
        // Ignore final incomplete line
      }
    }
  });
}

function processNDJSONObject(
  obj: Record<string, unknown>,
  callbacks: {
    onStreamMessage: (msg: StreamMessage) => void;
    onPMCommand: (cmd: PMCommand) => void;
    onSessionId: (sessionId: string) => void;
    onError: (err: Error) => void;
  }
): void {
  const now = Date.now();

  // Extract session ID from the result message at the end
  if (obj.type === 'result' && typeof obj.session_id === 'string') {
    callbacks.onSessionId(obj.session_id);
  }

  // Handle assistant text content
  if (obj.type === 'assistant' && obj.message) {
    const message = obj.message as { content?: Array<{ type: string; text?: string }> };
    if (message.content) {
      for (const block of message.content) {
        if (block.type === 'text' && block.text) {
          // Check for PM commands embedded in the text
          const commands = extractPMCommands(block.text);
          for (const cmd of commands) {
            callbacks.onPMCommand(cmd);
          }

          // Strip command blocks from visible text and emit remainder
          const visibleText = stripCommandBlocks(block.text);
          if (visibleText.trim()) {
            callbacks.onStreamMessage({
              type: 'text',
              content: visibleText,
              timestamp: now,
            });
          }
        }
      }
    }
  }

  // Handle tool use
  if (obj.type === 'tool_use') {
    callbacks.onStreamMessage({
      type: 'tool_use',
      content: JSON.stringify(obj),
      timestamp: now,
    });
  }

  // Handle tool result
  if (obj.type === 'tool_result') {
    callbacks.onStreamMessage({
      type: 'tool_result',
      content: JSON.stringify(obj),
      timestamp: now,
    });
  }

  // Handle content_block_delta (streaming text tokens)
  if (obj.type === 'content_block_delta') {
    const delta = obj as { delta?: { type: string; text?: string } };
    if (delta.delta?.type === 'text_delta' && delta.delta.text) {
      callbacks.onStreamMessage({
        type: 'text',
        content: delta.delta.text,
        timestamp: now,
      });
    }
  }
}
```

### 7.3 PM Command Extraction

The PM emits commands as fenced JSON blocks inside its text output. The Command Executor detects these with a regex pattern:

```typescript
const PM_COMMAND_REGEX = /```json\s*\n(\{[\s\S]*?\})\s*\n```/g;

const VALID_COMMANDS = new Set([
  'create_ticket',
  'move_ticket',
  'spawn_worker',
  'kill_worker',
  'message_user',
  'request_decision',
  'mark_complete',
]);

export function extractPMCommands(text: string): PMCommand[] {
  const commands: PMCommand[] = [];
  let match: RegExpExecArray | null;

  // Reset regex lastIndex
  PM_COMMAND_REGEX.lastIndex = 0;

  while ((match = PM_COMMAND_REGEX.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && typeof parsed.cmd === 'string' && VALID_COMMANDS.has(parsed.cmd)) {
        commands.push(parsed as PMCommand);
      }
    } catch {
      // Skip malformed JSON blocks
    }
  }

  return commands;
}

export function stripCommandBlocks(text: string): string {
  return text.replace(PM_COMMAND_REGEX, '').trim();
}
```

### 7.4 Sending Messages to a Running Process via stdin

```typescript
class ClaudeAgentProcess implements AgentProcess {
  private child: ChildProcess;

  async send(message: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.child.stdin || this.child.killed) {
        reject(new Error('Process stdin not available or process killed'));
        return;
      }
      // Write the message followed by a newline to stdin
      const ok = this.child.stdin.write(message + '\n', 'utf-8', (err) => {
        if (err) reject(err);
        else resolve();
      });
      if (!ok) {
        // Backpressure - wait for drain
        this.child.stdin.once('drain', () => resolve());
      }
    });
  }
}
```

### 7.5 Session Resumption for PM Multi-Turn

```typescript
class TweebManager {
  async sendMessageToPM(projectId: string, userMessage: string): Promise<void> {
    const project = db.getProject(projectId);
    if (!project) throw new Error('Project not found');

    // Check if PM process is already running
    const pmTweeb = db.listTweebsByProject(projectId).find(t => t.role === 'pm');
    if (!pmTweeb) throw new Error('No PM Tweeb for project');

    const existingProcess = this.processes.get(pmTweeb.id);

    if (existingProcess && !existingProcess.process.killed) {
      // PM is still running -- send directly to stdin
      await existingProcess.send(userMessage);
    } else {
      // PM process exited -- resume session with a new process
      const systemPromptPath = path.join(app.getAppPath(), 'prompts', 'pm.md');
      const child = spawnClaudeProcess({
        prompt: userMessage,
        workingDir: project.project_path,
        systemPromptPath,
        sessionId: project.pm_session_id ?? undefined,
      });

      const agentProcess = this.wrapChildProcess(child, pmTweeb.id, 'pm');
      this.processes.set(pmTweeb.id, agentProcess);

      // Set up stream parsing and command execution
      this.setupPMHandlers(agentProcess, project);
    }
  }
}
```

**Fallback if `--resume` does not work with `-p --output-format stream-json`:**

```typescript
// Option B: Accumulate full conversation history
async sendMessageToPMFallback(projectId: string, userMessage: string): Promise<void> {
  const messages = db.listMessagesByProject(projectId);
  // Build a single prompt with full conversation context
  const fullPrompt = messages
    .map(m => `${m.role === 'user' ? 'User' : 'PM'}: ${m.content}`)
    .join('\n\n')
    + `\n\nUser: ${userMessage}`;

  const child = spawnClaudeProcess({
    prompt: fullPrompt,
    workingDir: project.project_path,
    systemPromptPath,
    // No sessionId -- fresh process each time
  });
  // ... rest of setup
}
```

### 7.6 Rate Limit Detection

```typescript
function setupRateLimitDetection(
  agentProcess: AgentProcess,
  tweebId: string,
  onRateLimited: (tweebId: string) => void,
): void {
  // 1. Parse NDJSON stream for rate limit errors
  agentProcess.onMessage((msg) => {
    if (msg.type === 'error') {
      const lower = msg.content.toLowerCase();
      if (lower.includes('rate limit') || lower.includes('429') || lower.includes('too many requests')) {
        onRateLimited(tweebId);
      }
    }
  });

  // 2. Parse stderr for rate limit warnings
  agentProcess.process.stderr?.on('data', (chunk: Buffer) => {
    const text = chunk.toString('utf-8').toLowerCase();
    if (text.includes('rate limit') || text.includes('429') || text.includes('too many requests')) {
      onRateLimited(tweebId);
    }
  });

  // 3. Detect process exit with specific codes
  agentProcess.onExit((code) => {
    // Claude Code CLI may exit with specific codes for rate limits
    // Document the code once verified empirically
    if (code === 429 || code === 2) {
      onRateLimited(tweebId);
    }
  });
}

// Exponential backoff retry
async function retryWithBackoff(
  tweebId: string,
  retryFn: () => Promise<void>,
  maxRetries: number = 6,
): Promise<void> {
  const delays = [30_000, 60_000, 120_000, 300_000, 600_000, 600_000]; // 30s, 1m, 2m, 5m, 10m, 10m

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await retryFn();
      return; // Success
    } catch (err) {
      if (attempt < maxRetries - 1) {
        db.updateTweeb(tweebId, { status: 'rate_limited' });
        // Push status to renderer
        await sleep(delays[attempt]);
      } else {
        db.updateTweeb(tweebId, { status: 'error' });
        throw err;
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### 7.7 Process Lifecycle

```typescript
// Full lifecycle for a worker Tweeb:
//
// 1. PM emits spawn_worker command
// 2. CommandExecutor.handleSpawnWorker() calls TweebManager.spawnWorker()
// 3. TweebManager:
//    a. Creates Tweeb record in SQLite (status: 'idle')
//    b. Creates Ticket record in SQLite (column: 'in_progress')
//    c. Writes task file to .tweebs/tasks/{tweeb-id}.json
//    d. Spawns claude -p process with task prompt and role system prompt
//    e. Updates Tweeb status to 'working'
//    f. Sets up stream parser and error handlers
//    g. Pushes board:update to renderer
// 4. Worker works:
//    - Stream output parsed for progress (tool_use events = work happening)
//    - Progress poller reads .tweebs/progress/{tweeb-id}.json every 5s
//    - Board updates pushed to renderer on each change
// 5. Worker finishes:
//    a. Process exits with code 0
//    b. TweebManager.onWorkerExit():
//       - Updates Tweeb status to 'done'
//       - Updates Ticket column to 'done'
//       - Pushes board:update to renderer
//       - Sends completion context to PM stdin
//       - Stops progress poller for this tweeb
//       - Removes process from Map
// 6. Worker crashes:
//    a. Process exits with non-zero code
//    b. TweebManager.onWorkerExit():
//       - Updates Tweeb status to 'error'
//       - Sends error context to PM stdin
//       - PM decides whether to retry or escalate

// Full lifecycle for PM:
//
// 1. User creates project -> TweebManager.spawnPM()
// 2. PM process created with initial greeting prompt
// 3. PM's NDJSON stream parsed by CommandExecutor
// 4. PM lives as long as the project is active
// 5. On app quit:
//    a. Save PM session_id to projects.pm_session_id in SQLite
//    b. Send SIGTERM to PM process
//    c. Wait up to 5s for graceful exit
//    d. SIGKILL if still running
// 6. On app reopen:
//    a. Check for active projects with pm_session_id
//    b. Resume PM via --resume flag
//    c. PM re-evaluates and continues
```

---

## 8. DATABASE MODULE DETAIL

### 8.1 Schema (SQL)

```sql
-- Migration 001: Initial schema

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  blueprint_id TEXT,
  project_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed', 'archived')),
  pm_session_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tweebs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_color TEXT NOT NULL,
  pid INTEGER,
  status TEXT NOT NULL DEFAULT 'idle' CHECK(status IN ('idle', 'working', 'blocked', 'done', 'rate_limited', 'error')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
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

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user', 'pm')),
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tweebs_project ON tweebs(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_project ON tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tweeb ON tickets(assigned_tweeb_id);
CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id, created_at);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('onboarding_complete', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('permissions_accepted', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('notification_enabled', 'true');
```

### 8.2 Query Functions (Implementation Patterns)

```typescript
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import type { Project, Tweeb, Ticket, Message, AppSettings } from '../../shared/types';

let db: Database.Database;

// --- Projects ---

export function createProject(
  project: Omit<Project, 'created_at' | 'updated_at'>
): Project {
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO projects (id, name, description, blueprint_id, project_path, status, pm_session_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    project.id,
    project.name,
    project.description,
    project.blueprint_id,
    project.project_path,
    project.status,
    project.pm_session_id,
    now,
    now,
  );
  return { ...project, created_at: now, updated_at: now };
}

export function getProject(id: string): Project | null {
  const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
  return (stmt.get(id) as Project) ?? null;
}

export function listProjects(): Project[] {
  const stmt = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC');
  return stmt.all() as Project[];
}

export function updateProject(
  id: string,
  updates: Partial<Pick<Project, 'name' | 'description' | 'status' | 'pm_session_id'>>
): Project {
  const now = Date.now();
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  const stmt = db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  return getProject(id)!;
}

// --- Messages ---

export function createMessage(message: Omit<Message, 'created_at'>): Message {
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO messages (id, project_id, role, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(message.id, message.project_id, message.role, message.content, now);
  return { ...message, created_at: now };
}

export function listMessagesByProject(projectId: string): Message[] {
  const stmt = db.prepare('SELECT * FROM messages WHERE project_id = ? ORDER BY created_at ASC');
  return stmt.all(projectId) as Message[];
}

// --- Settings ---

export function getSetting(key: string): string | null {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const row = stmt.get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  stmt.run(key, value);
}

export function getAllSettings(): AppSettings {
  return {
    username: getSetting('username') ?? '',
    permissions_accepted: getSetting('permissions_accepted') === 'true',
    onboarding_complete: getSetting('onboarding_complete') === 'true',
    notification_enabled: getSetting('notification_enabled') !== 'false',
  };
}
```

### 8.3 Migration Runner

```typescript
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

const SCHEMA_VERSION_KEY = 'schema_version';

export function runMigrations(db: Database.Database): void {
  const currentVersion = getSchemaVersion(db);
  const migrationsDir = path.join(__dirname, 'migrations');

  // For V1, just run the initial schema directly
  if (currentVersion === 0) {
    const initialSchema = fs.readFileSync(
      path.join(migrationsDir, '001_initial.sql'),
      'utf-8'
    );
    db.exec(initialSchema);
    setSchemaVersion(db, 1);
    return;
  }

  // For future versions, run sequential migrations
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const version = parseInt(file.split('_')[0], 10);
    if (version > currentVersion) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      const transaction = db.transaction(() => {
        db.exec(sql);
        setSchemaVersion(db, version);
      });
      transaction();
    }
  }
}

function getSchemaVersion(db: Database.Database): number {
  try {
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const row = stmt.get(SCHEMA_VERSION_KEY) as { value: string } | undefined;
    return row ? parseInt(row.value, 10) : 0;
  } catch {
    // Table doesn't exist yet
    return 0;
  }
}

function setSchemaVersion(db: Database.Database, version: number): void {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  stmt.run(SCHEMA_VERSION_KEY, String(version));
}
```

---

## 9. ELECTRON-VITE CONFIG

`electron.vite.config.ts`:

```typescript
import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
        },
        external: ['better-sqlite3'],
      },
    },
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
        '@main': resolve(__dirname, 'src/main'),
      },
    },
  },

  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
        },
      },
    },
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
  },

  renderer: {
    plugins: [react()],
    root: resolve(__dirname, 'src/renderer'),
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
        },
      },
    },
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
        '@renderer': resolve(__dirname, 'src/renderer'),
        '@components': resolve(__dirname, 'src/renderer/components'),
        '@stores': resolve(__dirname, 'src/renderer/stores'),
        '@styles': resolve(__dirname, 'src/renderer/styles'),
      },
    },
  },
});
```

`package.json` (relevant fields):

```json
{
  "name": "tweebs",
  "version": "0.1.0",
  "description": "AI team that builds your projects",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "start": "electron-vite preview",
    "package": "electron-vite build && electron-builder",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "electron-vite": "^2.0.0",
    "typescript": "^5.6.0"
  },
  "build": {
    "appId": "app.tweebs.desktop",
    "productName": "TWEEBS",
    "mac": {
      "target": "dmg",
      "category": "public.app-category.developer-tools",
      "identity": null,
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist"
    },
    "files": [
      "out/**/*",
      "blueprints/**/*",
      "prompts/**/*",
      "assets/**/*"
    ],
    "extraResources": [
      {
        "from": "blueprints/",
        "to": "blueprints/"
      },
      {
        "from": "prompts/",
        "to": "prompts/"
      },
      {
        "from": "assets/",
        "to": "assets/"
      }
    ],
    "nsis": {
      "oneClick": false
    }
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@main/*": ["src/main/*"],
      "@renderer/*": ["src/renderer/*"],
      "@components/*": ["src/renderer/components/*"],
      "@stores/*": ["src/renderer/stores/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "out", "dist"]
}
```

---

## 10. CHROME DEVTOOLS MCP SETUP

### 10.1 What It Is

Chrome DevTools MCP lets Claude Code inspect the running Electron renderer via Chrome DevTools Protocol. DOM, CSS, console -- all as text tokens. Cheaper than screenshots.

### 10.2 Enable Remote Debugging in Electron

In `src/main/index.ts`, add the remote debugging port flag before app ready:

```typescript
import { app, BrowserWindow } from 'electron';

// Enable Chrome DevTools Protocol on port 9222
app.commandLine.appendSwitch('remote-debugging-port', '9222');

app.whenReady().then(() => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for better-sqlite3 in preload if needed
    },
  });

  // Open DevTools in dev mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
});
```

### 10.3 MCP Server Package

Use `@anthropic-ai/electron-mcp-server` (or the equivalent Chrome DevTools MCP package).

### 10.4 Dev-Time `.mcp.json` Config

Place at the TWEEBS repo root (`.mcp.json` or `.claude/mcp.json`):

```json
{
  "mcpServers": {
    "electron-devtools": {
      "command": "npx",
      "args": ["@anthropic-ai/electron-mcp-server"],
      "transport": "stdio"
    }
  }
}
```

### 10.5 Full Dev Workflow

1. Start the Electron app in dev mode:
   ```bash
   npm run dev
   ```
   This starts electron-vite dev server with HMR. The `--remote-debugging-port=9222` flag is set in the main process code.

2. Claude Code connects to the MCP server automatically (reads `.mcp.json`).

3. Claude Code can now:
   - **Read DOM**: Get the full DOM tree of the renderer as text. See component structure.
   - **Read CSS**: Get computed styles for any element. Debug layout.
   - **Read Console**: Get `console.log` output, errors, warnings.
   - **Take Screenshots**: Targeted element screenshots when visual verification is needed.
   - **Interact**: Click buttons, type text -- useful for testing flows.

4. Typical iteration cycle:
   - Claude edits a React component
   - electron-vite hot-reloads (< 1 second)
   - Claude reads DOM via MCP to verify structure (500-2000 text tokens)
   - Claude reads CSS via MCP to verify styles (200-500 text tokens)
   - Only takes a screenshot for visual QA (1000-3000 vision tokens, use sparingly)

### 10.6 Connecting to the Right Target

The MCP server needs to connect to the Electron renderer's debugger endpoint. `@anthropic-ai/electron-mcp-server` handles this by discovering targets on `localhost:9222`.

If the MCP server needs explicit configuration for the debugging endpoint:

```json
{
  "mcpServers": {
    "electron-devtools": {
      "command": "npx",
      "args": [
        "@anthropic-ai/electron-mcp-server",
        "--port", "9222"
      ],
      "transport": "stdio"
    }
  }
}
```

---

## APPENDIX A: ROLE-TO-AVATAR MAPPING

| Role | Display Name | Avatar Color | Hex |
|------|-------------|-------------|-----|
| `pm` | Project Manager | `blue` | `#3B82F6` |
| `architect` | Architect | `teal` | `#14B8A6` |
| `ux-designer` | Designer | `purple` | `#A855F7` |
| `frontend-engineer` | Frontend Engineer | `green` | `#22C55E` |
| `backend-engineer` | Backend Engineer | `yellow` | `#EAB308` |
| `mobile-engineer` | Mobile Engineer | `red` | `#EF4444` |
| `qa-engineer` | QA Engineer | `orange` | `#F97316` |
| `sdet` | SDET | `pink` | `#EC4899` |

## APPENDIX B: IPC HANDLER REGISTRATION PATTERN

All IPC handlers registered in `src/main/ipc/index.ts`:

```typescript
import { BrowserWindow } from 'electron';
import { TweebManager } from '../agents/manager';
import { registerAgentHandlers } from './agents';
import { registerProjectHandlers } from './projects';
import { registerOnboardingHandlers } from './onboarding';
import { registerSettingsHandlers } from './settings';

export function registerIPCHandlers(window: BrowserWindow, manager: TweebManager): void {
  registerAgentHandlers(manager, window);
  registerProjectHandlers();
  registerOnboardingHandlers(window);
  registerSettingsHandlers();
}
```

Each handler module uses `ipcMain.handle()` for invoke/handle pairs (renderer calls, main responds) and `window.webContents.send()` for event pushes (main pushes to renderer).

```typescript
// Pattern: renderer -> main (invoke/handle)
ipcMain.handle('channel:name', async (_event, payload) => {
  // Process payload, return response
  return response;
});

// Pattern: main -> renderer (event push)
window.webContents.send('channel:name', payload);
```

## APPENDIX C: ID GENERATION

All IDs use `crypto.randomUUID()` (Node.js built-in). Format: standard UUID v4.

```typescript
import { randomUUID } from 'crypto';

// Project IDs
const projectId = randomUUID(); // "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

// Tweeb IDs include role prefix for readability
const tweebId = `${role}-${randomUUID().slice(0, 8)}`; // "fe-a1b2c3d4"

// Ticket IDs
const ticketId = `ticket-${randomUUID().slice(0, 8)}`; // "ticket-a1b2c3d4"

// Message IDs
const messageId = randomUUID();
```

## APPENDIX D: WINDOW CONFIGURATION

```typescript
const mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  minWidth: 800,
  minHeight: 600,
  titleBarStyle: 'hiddenInset', // macOS native title bar with inset traffic lights
  trafficLightPosition: { x: 16, y: 16 },
  backgroundColor: '#0f0f0f', // Dark background to prevent flash
  show: false, // Show after ready-to-show to prevent flash
  webPreferences: {
    preload: path.join(__dirname, '../preload/index.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false,
  },
});

mainWindow.once('ready-to-show', () => {
  mainWindow.show();
});

// Remember window bounds
mainWindow.on('close', () => {
  const bounds = mainWindow.getBounds();
  db.setSetting('window_bounds', JSON.stringify(bounds));
});

// Restore window bounds on launch
const savedBounds = db.getSetting('window_bounds');
if (savedBounds) {
  const bounds = JSON.parse(savedBounds);
  mainWindow.setBounds(bounds);
}
```

## APPENDIX E: GRACEFUL SHUTDOWN

```typescript
import { app } from 'electron';

app.on('before-quit', async (event) => {
  event.preventDefault();

  try {
    // 1. Save PM session IDs
    const activeProjects = db.listProjects().filter(p => p.status === 'active');
    for (const project of activeProjects) {
      const pmTweeb = db.listTweebsByProject(project.id).find(t => t.role === 'pm');
      if (pmTweeb) {
        const process = manager.getProcess(pmTweeb.id);
        if (process) {
          // Session ID was captured during stream parsing and stored on the AgentProcess
          db.updateProject(project.id, { pm_session_id: process.sessionId });
        }
      }
    }

    // 2. Kill all processes gracefully
    await manager.shutdownAll(); // SIGTERM, wait 5s, SIGKILL

    // 3. Close database
    db.close();
  } finally {
    app.exit(0);
  }
});
```

## APPENDIX F: PROGRESS POLLER

```typescript
class TweebManager {
  private async pollProgress(projectId: string): Promise<void> {
    const project = db.getProject(projectId);
    if (!project) return;

    const progressDir = path.join(project.project_path, '.tweebs', 'progress');

    let files: string[];
    try {
      files = fs.readdirSync(progressDir).filter(f => f.endsWith('.json'));
    } catch {
      return; // Directory doesn't exist yet
    }

    let changed = false;

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(progressDir, file), 'utf-8');
        const progress: ProgressFile = JSON.parse(content);

        const tweeb = db.getTweeb(progress.tweebId);
        if (!tweeb) continue;

        // Only update if status changed
        if (tweeb.status !== progress.status) {
          db.updateTweeb(progress.tweebId, { status: progress.status as TweebStatus });
          changed = true;
        }

        // Update ticket based on progress
        if (progress.status === 'done' && progress.currentTask) {
          const ticket = db.getTicket(progress.currentTask);
          if (ticket && ticket.column_name !== 'done') {
            db.updateTicket(progress.currentTask, { column_name: 'done' });
            changed = true;
          }
        }

        // Handle blocked status
        if (progress.status === 'blocked' && progress.blockers.length > 0) {
          // Send blocker context to PM
          const pmTweeb = db.listTweebsByProject(projectId).find(t => t.role === 'pm');
          if (pmTweeb) {
            const blockerMsg = `Worker ${progress.role} is blocked on task "${progress.currentTask}": ${progress.blockers[0].question}`;
            await this.sendToProcess(pmTweeb.id, blockerMsg);
          }
        }
      } catch {
        // Skip malformed progress files
      }
    }

    if (changed) {
      this.pushBoardUpdate(projectId);
    }
  }

  startProgressPoller(projectId: string): void {
    if (this.pollerIntervals.has(projectId)) return;
    const interval = setInterval(() => this.pollProgress(projectId), 5000);
    this.pollerIntervals.set(projectId, interval);
  }

  stopProgressPoller(projectId: string): void {
    const interval = this.pollerIntervals.get(projectId);
    if (interval) {
      clearInterval(interval);
      this.pollerIntervals.delete(projectId);
    }
  }

  private pushBoardUpdate(projectId: string): void {
    const tickets = db.listTicketsByProject(projectId);
    const tweebs = db.listTweebsByProject(projectId);
    this.window.webContents.send('board:update', { projectId, tickets, tweebs });
  }
}
```

## APPENDIX G: FILE PATHS AT RUNTIME

```typescript
import { app } from 'electron';
import path from 'path';

// Database
const DB_PATH = path.join(app.getPath('userData'), 'tweebs.db');
// ~/Library/Application Support/tweebs/tweebs.db

// User projects base
const PROJECTS_BASE = path.join(app.getPath('home'), 'tweebs-projects');
// ~/tweebs-projects/

// Project directory
const projectDir = (name: string) => path.join(PROJECTS_BASE, slugify(name));
// ~/tweebs-projects/photography-portfolio/

// Blueprint definitions (bundled with app)
const BLUEPRINTS_DIR = path.join(app.getAppPath(), 'blueprints');

// Runtime prompts (bundled with app)
const PROMPTS_DIR = path.join(app.getAppPath(), 'prompts');

// System prompt for a role
const systemPromptPath = (role: TweebRole) => path.join(PROMPTS_DIR, `${role}.md`);

// Coordination files within a project
const tweebsDir = (projectPath: string) => path.join(projectPath, '.tweebs');
const tasksDir = (projectPath: string) => path.join(projectPath, '.tweebs', 'tasks');
const progressDir = (projectPath: string) => path.join(projectPath, '.tweebs', 'progress');
const artifactsDir = (projectPath: string) => path.join(projectPath, '.tweebs', 'artifacts');

// Slugify project name for directory
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
```
