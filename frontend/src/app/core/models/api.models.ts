export interface User { id: string; email: string; username: string; is_active: boolean; is_admin: boolean; created_at: string; }
export interface AuthRequest { email: string; password: string; }
export interface RegisterRequest extends AuthRequest { username: string; }
export interface TokenResponse { access_token: string; token_type: string; user: User; }
export type PasteVisibility = 'public' | 'unlisted' | 'private';
export type ExpirationOption = 'never' | '10m' | '1h' | '1d' | '1w' | '1mo';
export interface PasteCreateRequest {
  title: string; content: string; language: string; visibility: PasteVisibility;
  burn_after_read: boolean; expiration: ExpirationOption; encrypt: boolean;
  zk_encrypted?: boolean; zk_iv?: string; allowed_ips?: string[];
  parent_id?: string; workspace_id?: string;
}
export interface PasteUpdateRequest { title?: string; language?: string; visibility?: PasteVisibility; }
export interface Paste {
  id: string; title: string; language: string; size_bytes: number;
  visibility: PasteVisibility; burn_after_read: boolean; is_encrypted: boolean;
  view_count: number; expires_at: string | null; created_at: string; owner_id: string | null;
  zk_encrypted?: boolean; zk_iv?: string; allowed_ips?: string[] | null;
  parent_id?: string | null; version?: number; fork_count?: number;
  workspace_id?: string | null;
}
export interface PasteWithBody extends Paste { content: string; }

export interface DiffLine { line_num_old: number | null; line_num_new: number | null; content: string; change_type: 'equal' | 'insert' | 'delete'; }
export interface DiffResult { paste_id: string; parent_id: string | null; version: number; diff_lines: DiffLine[]; additions: number; deletions: number; unchanged: number; }

export interface HourlyStats { hour: string; event_count: number; unique_ips: number; }
export interface PasteAnalytics { paste_id: string; total_views: number; unique_visitors: number; hourly: HourlyStats[]; top_referers: { referer: string; count: number }[]; first_seen: string | null; last_seen: string | null; error?: string; }

export interface WebhookConfig { id: string; target_url: string; events: string[]; is_active: boolean; created_at: string; last_triggered_at: string | null; failure_count: number; }
export interface WebhookCreate { target_url: string; secret_token: string; events: string[]; }

export type WorkspaceRole = 'owner' | 'editor' | 'viewer';
export interface Workspace { id: string; name: string; slug: string; owner_id: string; is_active: boolean; created_at: string; }
export interface WorkspaceMember { id: string; workspace_id: string; user_id: string; role: WorkspaceRole; invited_at: string; }
export interface WorkspaceCreate { name: string; slug: string; }
export interface InviteMember { user_email: string; role: WorkspaceRole; }
