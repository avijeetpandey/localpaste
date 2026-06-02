import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { PasteService } from '../../core/services/paste.service';
import { ToastService } from '../../core/services/toast.service';
import { Paste } from '../../core/models/api.models';
import { formatBytes, timeAgo, timeUntil } from '../../shared/utils/format';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fadeInUp">
      <!-- Header row -->
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-lg font-semibold" style="color:rgb(var(--foreground))">Your pastes</h1>
          <p class="text-sm mt-0.5" style="color:rgb(var(--muted-foreground))">
            @if (!loading()) { {{ pastes().length }} paste{{ pastes().length !== 1 ? 's' : '' }} total }
          </p>
        </div>
        <a routerLink="/" class="btn-primary">
          <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"/></svg>
          New paste
        </a>
      </div>

      <!-- Stats strip -->
      @if (!loading() && pastes().length > 0) {
        <div class="grid grid-cols-3 gap-3">
          <div class="card p-4 text-center">
            <div class="text-2xl font-bold tabular-nums" style="color:rgb(var(--foreground))">{{ pastes().length }}</div>
            <div class="text-xs mt-0.5" style="color:rgb(var(--muted-foreground))">Total</div>
          </div>
          <div class="card p-4 text-center">
            <div class="text-2xl font-bold tabular-nums" style="color:rgb(var(--foreground))">{{ totalViews() }}</div>
            <div class="text-xs mt-0.5" style="color:rgb(var(--muted-foreground))">Views</div>
          </div>
          <div class="card p-4 text-center">
            <div class="text-2xl font-bold tabular-nums" style="color:rgb(var(--foreground))">{{ publicCount() }}</div>
            <div class="text-xs mt-0.5" style="color:rgb(var(--muted-foreground))">Public</div>
          </div>
        </div>
      }

      <!-- Loading skeleton -->
      @if (loading()) {
        <div class="card divide-y" style="divide-color:rgb(var(--border))">
          @for (_ of [1,2,3,4]; track $index) {
            <div class="flex items-center gap-4 px-4 py-4">
              <div class="flex-1 space-y-2">
                <div class="flex gap-2 items-center">
                  <div class="skeleton h-4 w-40 rounded"></div>
                  <div class="skeleton h-5 w-16 rounded-full"></div>
                </div>
                <div class="skeleton h-3 w-64 rounded"></div>
              </div>
              <div class="skeleton h-8 w-16 rounded-md"></div>
            </div>
          }
        </div>
      } @else if (pastes().length === 0) {
        <!-- Empty state -->
        <div class="card text-center py-16 px-4">
          <div class="text-4xl mb-4">📋</div>
          <h2 class="text-base font-semibold mb-1" style="color:rgb(var(--foreground))">No pastes yet</h2>
          <p class="text-sm mb-6" style="color:rgb(var(--muted-foreground))">Create your first paste to start sharing code and text.</p>
          <a routerLink="/" class="btn-primary inline-flex">
            <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"/></svg>
            Create paste
          </a>
        </div>
      } @else {
        <!-- Paste list -->
        <div class="card overflow-hidden divide-y" style="divide-color:rgb(var(--border))">
          @for (p of pastes(); track p.id) {
            <div class="group flex items-center gap-3 px-4 py-3.5 transition-colors duration-100"
                 style="transition:background 0.1s;"
                 onmouseenter="this.style.background='rgb(var(--muted)/0.5)'"
                 onmouseleave="this.style.background=''">
              <!-- Language icon pill -->
              <span class="badge-blue font-mono text-xs flex-shrink-0">{{ p.language }}</span>

              <!-- Main info -->
              <a [routerLink]="['/p', p.id]" class="flex-1 min-w-0 group/link">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="font-medium text-sm truncate transition-colors duration-150"
                        style="color:rgb(var(--foreground))">{{ p.title }}</span>
                  <span class="badge flex-shrink-0">{{ p.visibility }}</span>
                  @if (p.burn_after_read) { <span class="badge-red flex-shrink-0">🔥</span> }
                  @if (p.is_encrypted)    { <span class="badge-purple flex-shrink-0">🔒</span> }
                </div>
                <div class="text-xs mt-0.5" style="color:rgb(var(--muted-foreground))">
                  {{ timeAgo(p.created_at) }}
                  &middot; {{ formatBytes(p.size_bytes) }}
                  &middot; {{ p.view_count }} views
                  @if (timeUntil(p.expires_at)) {
                    &middot; expires {{ timeUntil(p.expires_at) }}
                  }
                </div>
              </a>

              <!-- Delete button (shows on hover) -->
              <button
                class="btn-icon opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0"
                style="color:rgb(var(--destructive))"
                type="button"
                (click)="remove(p)"
                [disabled]="deletingId() === p.id"
                title="Delete paste">
                @if (deletingId() === p.id) {
                  <span class="spinner" style="border-color:rgb(var(--destructive));border-top-color:transparent;"></span>
                } @else {
                  <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.493.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"/>
                  </svg>
                }
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private svc = inject(PasteService);
  private toast = inject(ToastService);

  readonly pastes = signal<Paste[]>([]);
  readonly loading = signal(true);
  readonly deletingId = signal<string | null>(null);

  readonly totalViews = computed(() => this.pastes().reduce((s, p) => s + p.view_count, 0));
  readonly publicCount = computed(() => this.pastes().filter((p) => p.visibility === 'public').length);

  formatBytes = formatBytes;
  timeAgo = timeAgo;
  timeUntil = timeUntil;

  ngOnInit(): void { this.refresh(); }

  refresh(): void {
    this.loading.set(true);
    this.svc.listMine().subscribe({
      next: (data) => { this.pastes.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Failed to load your pastes'); },
    });
  }

  remove(p: Paste): void {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    this.deletingId.set(p.id);
    this.svc.delete(p.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.pastes.update((list) => list.filter((x) => x.id !== p.id));
        this.toast.success('Paste deleted');
      },
      error: () => { this.deletingId.set(null); this.toast.error('Failed to delete paste'); },
    });
  }
}
