import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { WebhookService } from '../../core/services/webhook.service';
import { WebhookConfig } from '../../core/models/api.models';
import { ToastService } from '../../core/services/toast.service';

const EVENT_OPTIONS = [
  { value: 'paste.created', label: 'Paste Created' },
  { value: 'paste.viewed', label: 'Paste Viewed' },
  { value: 'paste.deleted', label: 'Paste Deleted' },
  { value: 'paste.expired', label: 'Paste Expired' },
];

@Component({
  selector: 'app-webhooks',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="webhooks-page">
      <div class="webhooks-header">
        <div class="header-left">
          <h1 class="page-title">Webhooks</h1>
          <p class="page-subtitle">Receive real-time HTTP notifications for paste events.</p>
        </div>
        <button class="btn btn-primary" (click)="showForm.set(!showForm())">
          @if (!showForm()) {
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"/></svg>
            Add webhook
          } @else {
            Cancel
          }
        </button>
      </div>

      @if (showForm()) {
        <div class="form-card animate-fadeInUp">
          <h2 class="form-title">New Webhook</h2>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <div class="form-group">
              <label class="form-label">Payload URL</label>
              <input type="url" formControlName="target_url" class="form-input" placeholder="https://example.com/hooks/localpaste">
              @if (form.get('target_url')?.invalid && form.get('target_url')?.touched) {
                <p class="field-error">Enter a valid HTTPS URL</p>
              }
            </div>
            <div class="form-group">
              <label class="form-label">Secret Token <span class="muted">(optional)</span></label>
              <input type="text" formControlName="secret_token" class="form-input" placeholder="Shared secret for HMAC-SHA256 verification">
            </div>
            <div class="form-group">
              <label class="form-label">Events</label>
              <div class="events-grid">
                @for (opt of eventOptions; track opt.value) {
                  <label class="event-checkbox">
                    <input
                      type="checkbox"
                      [checked]="isEventSelected(opt.value)"
                      (change)="toggleEvent(opt.value)"
                    >
                    <span>{{ opt.label }}</span>
                  </label>
                }
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" [disabled]="form.invalid || saving()">
                @if (saving()) { <span class="spinner"></span> Saving... }
                @else { Add Webhook }
              </button>
            </div>
          </form>
        </div>
      }

      @if (loading()) {
        <div class="skeleton-list">
          @for (i of [1,2]; track i) {
            <div class="skeleton-row shimmer"></div>
          }
        </div>
      } @else if (webhooks().length === 0) {
        <div class="empty-state-container">
          <div class="empty-icon">🔗</div>
          <p class="empty-title">No webhooks configured</p>
          <p class="empty-subtitle">Add a webhook to receive HTTP POST notifications for paste events.</p>
        </div>
      } @else {
        <div class="webhook-list">
          @for (wh of webhooks(); track wh.id) {
            <div class="webhook-card" [class.inactive]="!wh.is_active">
              <div class="webhook-main">
                <div class="webhook-status" [class.active]="wh.is_active" [title]="wh.is_active ? 'Active' : 'Inactive'"></div>
                <div class="webhook-info">
                  <div class="webhook-url">{{ wh.target_url }}</div>
                  <div class="webhook-meta">
                    <span class="badge">{{ wh.events.join(', ') }}</span>
                    <span class="muted text-xs">Created {{ wh.created_at | date:'mediumDate' }}</span>
                  </div>
                </div>
              </div>
              <div class="webhook-actions">
                <button class="btn btn-ghost btn-sm" (click)="testWebhook(wh)" title="Send test event">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h11A1.5 1.5 0 0 1 15 2.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5Zm1.5 0v11h11v-11Zm5.25 6.56L10.5 6.31V9h1.5V5.5a.75.75 0 0 0-.75-.75H8a.75.75 0 0 0 0 1.5h1.94L6.78 9.41a.75.75 0 1 0 1.06 1.06z"/></svg>
                  Test
                </button>
                <button
                  class="btn btn-ghost btn-sm"
                  (click)="toggleActive(wh)"
                  [title]="wh.is_active ? 'Disable' : 'Enable'"
                >
                  {{ wh.is_active ? 'Disable' : 'Enable' }}
                </button>
                <button class="btn btn-ghost btn-sm danger" (click)="deleteWebhook(wh.id)">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.576l-.66-6.6a.75.75 0 1 1 1.492-.149ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"/></svg>
                  Delete
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .webhooks-page { max-width: 900px; margin: 0 auto; padding: 2rem 1rem; }
    .webhooks-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
    .page-title { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.25rem; }
    .page-subtitle { color: var(--color-fg-muted); margin: 0; font-size: 0.875rem; }
    .form-card { background: var(--color-canvas-subtle); border: 1px solid var(--color-border-default); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; }
    .form-title { font-size: 1rem; font-weight: 600; margin: 0 0 1.25rem; }
    .form-group { margin-bottom: 1rem; }
    .form-label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.375rem; }
    .form-input { width: 100%; padding: 0.5rem 0.75rem; background: var(--color-canvas-default); border: 1px solid var(--color-border-default); border-radius: 6px; color: var(--color-fg-default); font-size: 0.875rem; transition: border-color 0.15s, box-shadow 0.15s; box-sizing: border-box; }
    .form-input:focus { outline: none; border-color: var(--color-accent-fg); box-shadow: 0 0 0 3px var(--color-accent-subtle); }
    .field-error { color: #f85149; font-size: 0.75rem; margin: 0.25rem 0 0; }
    .events-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.5rem; }
    .event-checkbox { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--color-border-muted); font-size: 0.875rem; transition: background 0.15s; }
    .event-checkbox:hover { background: var(--color-canvas-default); }
    .form-actions { display: flex; justify-content: flex-end; padding-top: 0.5rem; }
    .skeleton-list { display: flex; flex-direction: column; gap: 1rem; }
    .skeleton-row { height: 70px; border-radius: 10px; }
    .empty-state-container { text-align: center; padding: 4rem 2rem; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
    .empty-title { font-size: 1.125rem; font-weight: 600; margin: 0 0 0.5rem; }
    .empty-subtitle { color: var(--color-fg-muted); margin: 0; font-size: 0.875rem; }
    .webhook-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .webhook-card { background: var(--color-canvas-subtle); border: 1px solid var(--color-border-default); border-radius: 10px; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; transition: box-shadow 0.2s; flex-wrap: wrap; }
    .webhook-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .webhook-card.inactive { opacity: 0.6; }
    .webhook-main { display: flex; align-items: center; gap: 1rem; flex: 1; min-width: 0; }
    .webhook-status { width: 10px; height: 10px; border-radius: 50%; background: #f85149; flex-shrink: 0; }
    .webhook-status.active { background: #3fb950; box-shadow: 0 0 6px rgba(63,185,80,0.5); }
    .webhook-info { min-width: 0; }
    .webhook-url { font-family: var(--font-mono); font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .webhook-meta { display: flex; gap: 0.75rem; align-items: center; margin-top: 0.25rem; }
    .webhook-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }
    .text-xs { font-size: 0.75rem; }
    .danger { color: #f85149 !important; }
    .danger:hover { background: rgba(248,81,73,0.1) !important; }
    .muted { color: var(--color-fg-muted); }
  `]
})
export class WebhooksComponent implements OnInit {
  private webhookSvc = inject(WebhookService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  webhooks = signal<WebhookConfig[]>([]);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  eventOptions = EVENT_OPTIONS;
  selectedEvents = signal<string[]>(['paste.created', 'paste.viewed']);

  form: FormGroup = this.fb.group({
    target_url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    secret_token: [''],
  });

  isEventSelected(val: string): boolean {
    return this.selectedEvents().includes(val);
  }

  toggleEvent(val: string): void {
    const current = this.selectedEvents();
    if (current.includes(val)) {
      this.selectedEvents.set(current.filter(v => v !== val));
    } else {
      this.selectedEvents.set([...current, val]);
    }
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.webhookSvc.list().subscribe({
      next: (w) => { this.webhooks.set(w); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const val = this.form.value;
    this.webhookSvc.create({
      target_url: val.target_url,
      secret_token: val.secret_token || '',
      events: this.selectedEvents(),
    }).subscribe({
      next: (wh) => {
        this.webhooks.update(list => [wh, ...list]);
        this.form.reset();
        this.showForm.set(false);
        this.saving.set(false);
        this.toast.success('✓ Webhook created and active');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.detail ?? 'Could not create webhook.');
      }
    });
  }

  toggleActive(wh: WebhookConfig) {
    this.webhookSvc.update(wh.id, { is_active: !wh.is_active }).subscribe({
      next: (updated) => {
        this.webhooks.update(list => list.map(w => w.id === updated.id ? updated : w));
        this.toast.success(wh.is_active ? 'Webhook disabled' : 'Webhook enabled');
      },
      error: () => this.toast.error('Could not update webhook.')
    });
  }

  testWebhook(wh: WebhookConfig) {
    this.webhookSvc.test(wh.id).subscribe({
      next: (res) => this.toast.success(res.message),
      error: () => this.toast.error('Test delivery failed.')
    });
  }

  deleteWebhook(id: string) {
    this.webhookSvc.delete(id).subscribe({
      next: () => {
        this.webhooks.update(list => list.filter(w => w.id !== id));
        this.toast.success('Webhook removed');
      },
      error: () => this.toast.error('Could not delete webhook.')
    });
  }
}
