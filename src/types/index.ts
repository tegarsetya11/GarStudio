export interface WorkspaceFile {
  id: string
  name: string
  path: string
  content: string
  isFolder?: boolean
  fileHandle?: FileSystemFileHandle
  children?: WorkspaceFile[]
}

export type ActivePanel = 'explorer' | 'editor' | 'preview' | 'agent' | 'git'

export type ViewMode = 'tri' | 'split' | 'preview-agent' | 'editor' | 'preview' | 'agent'
export type SplitOrientation = 'horizontal' | 'vertical'

export type AIStage = 'idle' | 'planning' | 'generating' | 'reviewing' | 'debugging' | 'done'

export type AIProvider = 'gemini' | 'claude' | 'copilot'
export type AIMode = 'plan' | 'interactive'

export interface AIPlanStep {
  id: string
  title: string
  description: string
  action: 'create' | 'modify' | 'delete'
  filePath: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
}

export interface AIPlan {
  goal: string
  overview: string
  steps: AIPlanStep[]
}

export interface FileChange {
  path: string
  summary: string
  code: string
  oldCode?: string
}

export interface AIMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  plan?: AIPlan
  changes?: FileChange[]
  stage?: AIStage
  errorContext?: PreviewError
}

export interface PreviewError {
  message: string
  source?: string
  lineno?: number
  colno?: number
  stack?: string
  timestamp: number
}

export interface GitHubConfig {
  token: string
  repo: string
  description: string
  isPrivate: boolean
  branch: string
}

export interface RateLimitInfo {
  provider: AIProvider
  message: string
  retryAfter?: number   // seconds
  limitType: 'quota' | 'rateLimit' | 'daily' | 'token'
  timestamp: number
}

export interface SettingsState {
  aiProvider: AIProvider
  geminiApiKey: string
  geminiModel: string
  claudeApiKey: string
  claudeModel: string
  copilotToken: string
  copilotModel: string
  githubToken: string
  fontSize: number
  wordWrap: boolean
  autoRunPreview: boolean
  previewDevice: 'mobile' | 'tablet' | 'desktop'
}

export interface UserSession {
  id: string
  name: string
  email: string
  provider: 'github' | 'google'
  avatarUrl?: string
}
