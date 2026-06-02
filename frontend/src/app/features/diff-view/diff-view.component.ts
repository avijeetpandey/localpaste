import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PasteService } from '../../core/services/paste.service';
import { DiffResult, DiffLine } from '../../core/models/api.models';

@Component({
  selector: 'app-diff-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="diff-page">
      <div class="diff-header">
        <a [routerLink]="['/p', pasteId()]" class="btn btn-ghost btn-sm back-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L4.81 7h7.44a.75.75 0 0 0 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06Z"/></svg>
          Back to paste
        </a>
        <div class="diff-title-row">
          <div class="diff-icon">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M1.75 1h4.5C7.216 1 8 1.784 8 2.75v4.5A1.75 1.75 0 0 1 6.25 9H5v1h1.25a.75.75 0 0 1 0 1.5H5V13a.75.75 0 0 1-1.5 0v-1.5H2.25a.75.75 0 0 1 0-1.5H3.5V9H2.75A1.75 1.75 0 0 1 1 7.25v-4.5C1 1.784 1.784 1 2.75 1zm3.5 6.5h.5V2.5h-4v4.5c0 .138.112.5.25.5h3zM9.75 7.5H11V7a.75.75 0 0 1 1.5 0v.5h1.25a.75.75 0 0 1 0 1.5H12.5v1h.5A1.75 1.75 0 0 1 14.75 11.75v4.5A1.75 1.75 0 0 1 13 18h-4.5A1.75 1.75 0 0 1 6.75 16.25v-4.5C6.75 10.784 7.534 10 8.5 10H9V8.5a.75.75 0 0 1 1.5 0v1h.25zm2 1.5H8.5A.25.25 0 0 0 8.25 9.25v4.5c0 .138.112.25.25.25H13A.25.25 0 0 0 13.25 13.75v-4.5a.25.25 0 0 0-.25-.25H11.75z"/></svg>
          </div>
          <div>
            <h1 class="diff-title">Diff View</h1>
            @if (diff()) {
              <p class="diff-subtitle">
                v{{ diff()!.version }} vs parent
                @if (diff()!.parent_id) {
                  <a [routerLink]="['/p', diff()!.parent_id]" class="parent-link">{{ diff()!.parent_id }}</a>
                } @else {
                  <span class="muted">(no parent — this is v1)</span>
                }
              </p>
            }
          </div>
        </div>

        @if (diff()) {
          <div class="diff-stats">
            <span class="addition-badge">+{{ diff()!.additions }} additions</span>
            <span class="deletion-badge">-{{ diff()!.deletions }} deletions</span>
          </div>
        }
      </div>

      @if (loading()) {
        <div class="diff-skeleton shimmer"></div>
      } @else if (error()) {
        <div class="empty-state-container">
          <div class="empty-icon">🔄</div>
          <p class="empty-title">Diff unavailable</p>
          <p class="empty-subtitle">{{ error() }}</p>
        </div>
      } @else if (diff()) {
        <div class="diff-table-wrapper">
          <table class="diff-table">
            <colgroup>
              <col class="col-old-num">
              <col class="col-new-num">
              <col class="col-content">
            </colgroup>
            <tbody>
              @for (line of diff()!.diff_lines; track $index) {
                <tr [class]="'diff-row diff-' + line.change_type">
                  <td class="line-num old-num">{{ line.line_num_old ?? '' }}</td>
                  <td class="line-num new-num">{{ line.line_num_new ?? '' }}</td>
                  <td class="line-content">
                    <span class="change-marker">{{ markerFor(line.change_type) }}</span>
                    <span class="line-text">{{ line.content }}</span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (diff()!.diff_lines.length === 0) {
          <div class="empty-state-container">
            <div class="empty-icon">✅</div>
            <p class="empty-title">No differences</p>
            <p class="empty-subtitle">This paste is identical to its parent version.</p>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .diff-page { max-width: 1000px; margin: 0 auto; padding: 2rem 1rem; }
    .diff-header { margin-bottom: 2rem; }
    .back-btn { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 1rem; color: var(--color-fg-muted); text-decoration: none; font-size: 0.875rem; transition: color 0.15s; }
    .back-btn:hover { color: var(--color-fg-default); }
    .diff-title-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; }
    .diff-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--color-accent-subtle); color: var(--color-accent-fg); display: flex; align-items: center; justify-content: center; }
    .diff-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
    .diff-subtitle { font-size: 0.875rem; color: var(--color-fg-muted); margin: 0; }
    .parent-link { color: var(--color-accent-fg); font-family: var(--font-mono); text-decoration: none; }
    .parent-link:hover { text-decoration: underline; }
    .muted { color: var(--color-fg-muted); }
    .diff-stats { display: flex; gap: 0.75rem; }
    .addition-badge { background: rgba(63,185,80,0.15); color: #3fb950; border: 1px solid rgba(63,185,80,0.3); border-radius: 20px; padding: 2px 10px; font-size: 0.8125rem; font-weight: 600; font-family: var(--font-mono); }
    .deletion-badge { background: rgba(248,81,73,0.15); color: #f85149; border: 1px solid rgba(248,81,73,0.3); border-radius: 20px; padding: 2px 10px; font-size: 0.8125rem; font-weight: 600; font-family: var(--font-mono); }
    .diff-skeleton { height: 400px; border-radius: 12px; }
    .diff-table-wrapper { background: var(--color-canvas-default); border: 1px solid var(--color-border-default); border-radius: 8px; overflow: hidden; overflow-x: auto; }
    .diff-table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.8125rem; }
    .col-old-num, .col-new-num { width: 48px; }
    .diff-row { vertical-align: top; }
    .line-num { padding: 2px 8px; text-align: right; color: var(--color-fg-muted); background: var(--color-canvas-subtle); border-right: 1px solid var(--color-border-muted); user-select: none; white-space: nowrap; min-width: 40px; font-size: 0.75rem; }
    .line-content { padding: 2px 16px; white-space: pre; overflow-x: visible; }
    .change-marker { display: inline-block; width: 16px; user-select: none; }
    .diff-insert { background: rgba(63,185,80,0.08); }
    .diff-insert .line-num { background: rgba(63,185,80,0.08); }
    .diff-insert .change-marker { color: #3fb950; }
    .diff-delete { background: rgba(248,81,73,0.08); }
    .diff-delete .line-num { background: rgba(248,81,73,0.08); }
    .diff-delete .change-marker { color: #f85149; }
    .diff-equal .change-marker { color: transparent; }
    .empty-state-container { text-align: center; padding: 4rem 2rem; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
    .empty-title { font-size: 1.125rem; font-weight: 600; margin: 0 0 0.5rem; }
    .empty-subtitle { color: var(--color-fg-muted); margin: 0; }
  `]
})
export class DiffViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private pasteSvc = inject(PasteService);

  pasteId = signal('');
  diff = signal<DiffResult | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  markerFor(changeType: string): string {
    if (changeType === 'insert') return '+';
    if (changeType === 'delete') return '-';
    return ' ';
  }

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.pasteId.set(id);
    this.pasteSvc.getDiff(id).subscribe({
      next: (d) => { this.diff.set(d); this.loading.set(false); },
      error: (err) => { this.error.set(err?.error?.detail ?? 'Failed to load diff'); this.loading.set(false); }
    });
  }
}
