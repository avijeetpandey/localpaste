import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { WorkspaceService } from '../../core/services/workspace.service';
import { Workspace, WorkspaceMember } from '../../core/models/api.models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-workspace-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="workspace-detail-page">
      <div class="detail-header">
        <a routerLink="/workspaces" class="btn btn-ghost btn-sm back-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L4.81 7h7.44a.75.75 0 0 0 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06Z"/></svg>
          All workspaces
        </a>

        @if (workspace()) {
          <div class="workspace-title-row">
            <div class="ws-avatar-lg" [style.background]="avatarColor(workspace()!.name)">
              {{ workspace()!.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <h1 class="workspace-title">{{ workspace()!.name }}</h1>
              <p class="workspace-slug">{{ workspace()!.slug }}</p>
            </div>
          </div>
        }
      </div>

      @if (loading()) {
        <div class="detail-skeleton shimmer"></div>
      } @else if (workspace()) {
        <div class="sections">
          <!-- Members section -->
          <section class="detail-section">
            <div class="section-header">
              <h2 class="section-title">Members</h2>
              <button class="btn btn-ghost btn-sm" (click)="showInvite.set(!showInvite())">
                @if (!showInvite()) {
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"/></svg>
                  Invite
                } @else { Cancel }
              </button>
            </div>

            @if (showInvite()) {
              <form [formGroup]="inviteForm" (ngSubmit)="inviteMember()" class="invite-form animate-fadeInUp">
                <input type="email" formControlName="email" class="form-input" placeholder="colleague@example.com">
                <select formControlName="role" class="form-select">
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="owner">Owner</option>
                </select>
                <button type="submit" class="btn btn-primary btn-sm" [disabled]="inviteForm.invalid || inviting()">
                  @if (inviting()) { <span class="spinner spinner-sm"></span> } @else { Invite }
                </button>
              </form>
            }

            <div class="member-list">
              @for (m of members(); track m.id) {
                <div class="member-row">
                  <div class="member-avatar">{{ memberInitial(m) }}</div>
                  <div class="member-info">
                    <span class="member-id">{{ m.user_id }}</span>
                  </div>
                  <span class="role-badge role-{{ m.role }}">{{ m.role }}</span>
                  <button class="btn btn-ghost btn-sm danger" (click)="removeMember(m)" title="Remove member">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/></svg>
                  </button>
                </div>
              }
            </div>
          </section>

          <!-- Danger zone -->
          <section class="danger-section">
            <h2 class="section-title danger-title">Danger Zone</h2>
            <div class="danger-row">
              <div>
                <p class="danger-action-title">Delete workspace</p>
                <p class="danger-desc">Once deleted, all workspace data is permanently removed.</p>
              </div>
              <button class="btn btn-danger" (click)="deleteWorkspace()">Delete workspace</button>
            </div>
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    .workspace-detail-page { max-width: 900px; margin: 0 auto; padding: 2rem 1rem; }
    .detail-header { margin-bottom: 2rem; }
    .back-btn { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 1rem; color: var(--color-fg-muted); text-decoration: none; font-size: 0.875rem; transition: color 0.15s; }
    .back-btn:hover { color: var(--color-fg-default); }
    .workspace-title-row { display: flex; align-items: center; gap: 1rem; }
    .ws-avatar-lg { width: 52px; height: 52px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; color: #fff; }
    .workspace-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
    .workspace-slug { font-size: 0.875rem; color: var(--color-fg-muted); margin: 0; font-family: var(--font-mono); }
    .detail-skeleton { height: 300px; border-radius: 12px; }
    .sections { display: flex; flex-direction: column; gap: 1.5rem; }
    .detail-section { background: var(--color-canvas-subtle); border: 1px solid var(--color-border-default); border-radius: 12px; padding: 1.5rem; }
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .section-title { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-fg-muted); margin: 0; }
    .invite-form { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .form-input { flex: 1; min-width: 200px; padding: 0.4rem 0.75rem; background: var(--color-canvas-default); border: 1px solid var(--color-border-default); border-radius: 6px; color: var(--color-fg-default); font-size: 0.875rem; }
    .form-input:focus { outline: none; border-color: var(--color-accent-fg); }
    .form-select { padding: 0.4rem 0.5rem; background: var(--color-canvas-default); border: 1px solid var(--color-border-default); border-radius: 6px; color: var(--color-fg-default); font-size: 0.875rem; }
    .member-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .member-row { display: flex; align-items: center; gap: 1rem; padding: 0.625rem; border-radius: 8px; transition: background 0.15s; }
    .member-row:hover { background: var(--color-canvas-default); }
    .member-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--color-accent-subtle); color: var(--color-accent-fg); display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.875rem; }
    .member-info { flex: 1; min-width: 0; }
    .member-id { font-family: var(--font-mono); font-size: 0.75rem; color: var(--color-fg-muted); }
    .role-badge { padding: 2px 8px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
    .role-owner { background: rgba(210,153,34,0.15); color: #d2a020; }
    .role-editor { background: rgba(63,185,80,0.15); color: #3fb950; }
    .role-viewer { background: rgba(139,148,158,0.15); color: #8b949e; }
    .danger-section { background: rgba(248,81,73,0.05); border: 1px solid rgba(248,81,73,0.3); border-radius: 12px; padding: 1.5rem; }
    .danger-title { color: #f85149; }
    .danger-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .danger-action-title { font-weight: 600; margin: 0 0 0.25rem; }
    .danger-desc { font-size: 0.875rem; color: var(--color-fg-muted); margin: 0; }
    .btn-danger { background: #da3633; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: background 0.2s; }
    .btn-danger:hover { background: #b92827; }
    .danger:hover { color: #f85149 !important; }
    .spinner-sm { width: 12px; height: 12px; border-width: 2px; }
  `]
})
export class WorkspaceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private workspaceSvc = inject(WorkspaceService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  // No router injection needed here — use Location if we want back navigation

  workspace = signal<Workspace | null>(null);
  members = signal<WorkspaceMember[]>([]);
  loading = signal(true);
  showInvite = signal(false);
  inviting = signal(false);

  inviteForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['viewer'],
  });

  AVATAR_COLORS = ['#238636', '#1f6feb', '#8957e5', '#d2a020', '#e3b341', '#db6d28', '#8b949e'];
  avatarColor(name: string): string {
    return this.AVATAR_COLORS[name.charCodeAt(0) % this.AVATAR_COLORS.length];
  }
  memberInitial(m: WorkspaceMember): string {
    return m.user_id.toString().charAt(0).toUpperCase();
  }

  ngOnInit() {
    const slug = this.route.snapshot.params['slug'];
    this.workspaceSvc.get(slug).subscribe({
      next: ({ workspace, members }) => {
        this.workspace.set(workspace);
        this.members.set(members);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.toast.error('Could not load workspace.'); }
    });
  }

  inviteMember() {
    const slug = this.workspace()?.slug;
    if (!slug || this.inviteForm.invalid) return;
    this.inviting.set(true);
    const val = this.inviteForm.value;
    this.workspaceSvc.invite(slug, { user_email: val.email!, role: val.role as any }).subscribe({
      next: (m) => {
        this.members.update(list => [...list, m]);
        this.inviteForm.reset({ role: 'viewer' });
        this.showInvite.set(false);
        this.inviting.set(false);
        this.toast.success('Member added to workspace');
      },
      error: (err) => {
        this.inviting.set(false);
        this.toast.error(err?.error?.detail ?? 'Could not invite member.');
      }
    });
  }

  removeMember(m: WorkspaceMember) {
    const slug = this.workspace()?.slug;
    if (!slug) return;
    this.workspaceSvc.removeMember(slug, m.user_id.toString()).subscribe({
      next: () => {
        this.members.update(list => list.filter(x => x.id !== m.id));
        this.toast.success('Member removed from workspace');
      },
      error: () => this.toast.error('Could not remove member.')
    });
  }

  deleteWorkspace() {
    const slug = this.workspace()?.slug;
    if (!slug) return;
    if (!confirm('Delete this workspace? This action cannot be undone.')) return;
    this.workspaceSvc.delete(slug).subscribe({
      next: () => {
        this.toast.success('Workspace deleted');
        history.back();
      },
      error: () => this.toast.error('Could not delete workspace.')
    });
  }
}
