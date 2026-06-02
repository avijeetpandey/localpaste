import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { WorkspaceService } from '../../core/services/workspace.service';
import { Workspace } from '../../core/models/api.models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="workspaces-page">
      <div class="workspaces-header">
        <div class="header-left">
          <h1 class="page-title">Workspaces</h1>
          <p class="page-subtitle">Collaborate with your team in shared workspaces.</p>
        </div>
        <button class="btn btn-primary" (click)="showForm.set(!showForm())">
          @if (!showForm()) {
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"/></svg>
            New workspace
          } @else {
            Cancel
          }
        </button>
      </div>

      @if (showForm()) {
        <div class="form-card animate-fadeInUp">
          <h2 class="form-title">Create Workspace</h2>
          <form [formGroup]="form" (ngSubmit)="createWorkspace()">
            <div class="form-group">
              <label class="form-label">Name</label>
              <input type="text" formControlName="name" class="form-input" placeholder="My Team">
              @if (form.get('name')?.invalid && form.get('name')?.touched) {
                <p class="field-error">Name is required</p>
              }
            </div>
            <div class="form-group">
              <label class="form-label">Slug <span class="muted">(URL identifier, lowercase alphanumeric with dashes)</span></label>
              <input type="text" formControlName="slug" class="form-input" placeholder="my-team">
              @if (form.get('slug')?.invalid && form.get('slug')?.touched) {
                <p class="field-error">Slug must be lowercase letters, numbers and dashes only</p>
              }
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" [disabled]="form.invalid || saving()">
                @if (saving()) { <span class="spinner"></span> Creating... }
                @else { Create Workspace }
              </button>
            </div>
          </form>
        </div>
      }

      @if (loading()) {
        <div class="workspace-grid">
          @for (i of [1,2,3]; track i) {
            <div class="skeleton-card shimmer"></div>
          }
        </div>
      } @else if (workspaces().length === 0) {
        <div class="empty-state-container">
          <div class="empty-icon">🏢</div>
          <p class="empty-title">No workspaces yet</p>
          <p class="empty-subtitle">Create a workspace to collaborate with teammates on shared pastes.</p>
        </div>
      } @else {
        <div class="workspace-grid">
          @for (ws of workspaces(); track ws.id) {
            <a [routerLink]="['/workspaces', ws.slug]" class="workspace-card">
              <div class="ws-avatar" [style.background]="avatarColor(ws.name)">
                {{ ws.name.charAt(0).toUpperCase() }}
              </div>
              <div class="ws-info">
                <div class="ws-name">{{ ws.name }}</div>
                <div class="ws-slug">{{ ws.slug }}</div>
              </div>
              <div class="ws-meta">
                <span class="badge">Owner</span>
                <span class="text-xs muted">{{ ws.created_at | date:'mediumDate' }}</span>
              </div>
              <svg class="ws-arrow" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"/></svg>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .workspaces-page { max-width: 900px; margin: 0 auto; padding: 2rem 1rem; }
    .workspaces-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
    .page-title { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.25rem; }
    .page-subtitle { color: var(--color-fg-muted); margin: 0; font-size: 0.875rem; }
    .form-card { background: var(--color-canvas-subtle); border: 1px solid var(--color-border-default); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; }
    .form-title { font-size: 1rem; font-weight: 600; margin: 0 0 1.25rem; }
    .form-group { margin-bottom: 1rem; }
    .form-label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.375rem; }
    .form-input { width: 100%; padding: 0.5rem 0.75rem; background: var(--color-canvas-default); border: 1px solid var(--color-border-default); border-radius: 6px; color: var(--color-fg-default); font-size: 0.875rem; transition: border-color 0.15s, box-shadow 0.15s; box-sizing: border-box; }
    .form-input:focus { outline: none; border-color: var(--color-accent-fg); box-shadow: 0 0 0 3px var(--color-accent-subtle); }
    .field-error { color: #f85149; font-size: 0.75rem; margin: 0.25rem 0 0; }
    .form-actions { display: flex; justify-content: flex-end; padding-top: 0.5rem; }
    .workspace-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .skeleton-card { height: 110px; border-radius: 12px; }
    .empty-state-container { text-align: center; padding: 4rem 2rem; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
    .empty-title { font-size: 1.125rem; font-weight: 600; margin: 0 0 0.5rem; }
    .empty-subtitle { color: var(--color-fg-muted); margin: 0; font-size: 0.875rem; }
    .workspace-card { display: flex; align-items: center; gap: 1rem; background: var(--color-canvas-subtle); border: 1px solid var(--color-border-default); border-radius: 12px; padding: 1.25rem; text-decoration: none; color: var(--color-fg-default); transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; }
    .workspace-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.1); border-color: var(--color-accent-fg); }
    .ws-avatar { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 700; color: #fff; flex-shrink: 0; }
    .ws-info { flex: 1; min-width: 0; }
    .ws-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ws-slug { font-size: 0.75rem; color: var(--color-fg-muted); font-family: var(--font-mono); }
    .ws-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; }
    .ws-arrow { color: var(--color-fg-muted); flex-shrink: 0; }
    .text-xs { font-size: 0.75rem; }
    .muted { color: var(--color-fg-muted); }
  `]
})
export class WorkspacesComponent implements OnInit {
  private workspaceSvc = inject(WorkspaceService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  workspaces = signal<Workspace[]>([]);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);

  form = this.fb.group({
    name: ['', Validators.required],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
  });

  AVATAR_COLORS = ['#238636', '#1f6feb', '#8957e5', '#d2a020', '#e3b341', '#db6d28', '#8b949e'];

  avatarColor(name: string): string {
    const idx = name.charCodeAt(0) % this.AVATAR_COLORS.length;
    return this.AVATAR_COLORS[idx];
  }

  ngOnInit() {
    this.workspaceSvc.list().subscribe({
      next: (ws) => { this.workspaces.set(ws); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  createWorkspace() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const val = this.form.value;
    this.workspaceSvc.create({ name: val.name!, slug: val.slug! }).subscribe({
      next: (ws) => {
        this.workspaces.update(list => [ws, ...list]);
        this.form.reset();
        this.showForm.set(false);
        this.saving.set(false);
        this.toast.success(`Workspace "${ws.name}" created`);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.detail ?? 'Could not create workspace.');
      }
    });
  }
}
