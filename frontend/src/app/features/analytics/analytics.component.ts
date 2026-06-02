import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PasteService } from '../../core/services/paste.service';
import { PasteAnalytics } from '../../core/models/api.models';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="analytics-page">
      <div class="analytics-header">
        <a [routerLink]="['/p', pasteId()]" class="btn btn-ghost btn-sm back-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L4.81 7h7.44a.75.75 0 0 1 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06Z"/></svg>
          Back to paste
        </a>
        <div class="analytics-title-row">
          <div class="analytics-icon">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 1.75A.75.75 0 0 0 0 1.75v12.5C0 15.216.784 16 1.75 16h12.5A.75.75 0 0 0 15 15.25V1.75A.75.75 0 0 0 14.25 1h-5a.75.75 0 0 0 0 1.5h4.5v11.5h-11V1.75a.75.75 0 0 0-.75-.75Z"/><path d="M5.72 8.47a.75.75 0 0 0 0 1.06l1.25 1.25a.75.75 0 0 0 1.06 0l3.47-3.47V8.5a.75.75 0 0 0 1.5 0V6a.75.75 0 0 0-.75-.75H9.75a.75.75 0 0 0 0 1.5h1.19L8 9.69 6.78 8.47a.75.75 0 0 0-1.06 0Z"/></svg>
          </div>
          <div>
            <h1 class="analytics-title">Analytics</h1>
            <p class="analytics-subtitle">Paste ID: {{ pasteId() }}</p>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="analytics-skeleton">
          @for (i of [1,2,3]; track i) {
            <div class="skeleton-card shimmer"></div>
          }
        </div>
      } @else if (error()) {
        <div class="empty-state-container">
          <div class="empty-icon">📊</div>
          <p class="empty-title">Analytics unavailable</p>
          <p class="empty-subtitle">{{ error() }}</p>
        </div>
      } @else if (data()) {
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon views-icon">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.45-.677 1.367-1.931 2.637-3.022C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.175 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.621-1.242-1.75-2.366-2.717C10.825 4.242 9.473 3.5 8 3.5c-1.473 0-2.825.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z"/></svg>
            </div>
            <div class="stat-value">{{ data()!.total_views | number }}</div>
            <div class="stat-label">Total Views</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon unique-icon">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM2 5.5a3.5 3.5 0 1 1 5.898 2.549 5.508 5.508 0 0 1 3.034 4.084.75.75 0 1 1-1.482.235 4 4 0 0 0-7.9 0 .75.75 0 0 1-1.482-.236A5.507 5.507 0 0 1 3.102 8.05 3.493 3.493 0 0 1 2 5.5ZM11 4a.75.75 0 1 0 0 1.5 1.5 1.5 0 0 1 .666 2.844.75.75 0 0 0-.416.672v.352a.75.75 0 0 0 .574.73c1.2.289 2.162 1.2 2.522 2.372a.75.75 0 1 0 1.434-.44 5.01 5.01 0 0 0-2.56-3.012A3 3 0 0 0 11 4Z"/></svg>
            </div>
            <div class="stat-value">{{ data()!.unique_visitors | number }}</div>
            <div class="stat-label">Unique Visitors</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon time-icon">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.751.751 0 0 1 7 8.25v-3.5a.75.75 0 0 1 1.5 0Z"/></svg>
            </div>
            <div class="stat-value">{{ data()!.first_seen ? (data()!.first_seen | date:'mediumDate') : 'N/A' }}</div>
            <div class="stat-label">First Seen</div>
          </div>
        </div>

        @if (hourlyData().length > 0) {
          <div class="chart-section">
            <h2 class="section-title">Views Over Time (Last 24h)</h2>
            <div class="bar-chart">
              @for (point of hourlyData(); track point.hour) {
                <div class="bar-column">
                  <div
                    class="bar-fill"
                    [style.height.%]="maxHourly() > 0 ? (point.event_count / maxHourly() * 100) : 0"
                    [title]="point.hour + ': ' + point.event_count + ' views'"
                  ></div>
                  <div class="bar-label">{{ point.hour | date:'HH' }}h</div>
                </div>
              }
            </div>
          </div>
        }

        @if (data()!.top_referers && data()!.top_referers.length > 0) {
          <div class="referers-section">
            <h2 class="section-title">Top Referers</h2>
            <div class="referer-list">
              @for (r of data()!.top_referers; track r.referer) {
                <div class="referer-item">
                  <div class="referer-bar-wrapper">
                    <div
                      class="referer-bar"
                      [style.width.%]="data()!.top_referers[0].count > 0 ? (r.count / data()!.top_referers[0].count * 100) : 0"
                    ></div>
                  </div>
                  <span class="referer-url">{{ r.referer || '(direct)' }}</span>
                  <span class="referer-count badge">{{ r.count }}</span>
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="empty-referers">
            <p>No referrer data yet.</p>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .analytics-page { max-width: 900px; margin: 0 auto; padding: 2rem 1rem; }
    .analytics-header { margin-bottom: 2rem; }
    .back-btn { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 1rem; color: var(--color-fg-muted); text-decoration: none; font-size: 0.875rem; transition: color 0.15s; }
    .back-btn:hover { color: var(--color-fg-default); }
    .analytics-title-row { display: flex; align-items: center; gap: 1rem; }
    .analytics-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--color-accent-subtle); color: var(--color-accent-fg); display: flex; align-items: center; justify-content: center; }
    .analytics-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
    .analytics-subtitle { font-size: 0.875rem; color: var(--color-fg-muted); margin: 0; font-family: var(--font-mono); }
    .analytics-skeleton { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
    .skeleton-card { height: 120px; border-radius: 12px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: var(--color-canvas-subtle); border: 1px solid var(--color-border-default); border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; transition: transform 0.2s, box-shadow 0.2s; }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
    .stat-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
    .views-icon { background: rgba(88,166,255,0.15); color: #58a6ff; }
    .unique-icon { background: rgba(63,185,80,0.15); color: #3fb950; }
    .time-icon { background: rgba(210,153,34,0.15); color: #d2a020; }
    .stat-value { font-size: 2rem; font-weight: 700; line-height: 1; }
    .stat-label { font-size: 0.75rem; color: var(--color-fg-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .section-title { font-size: 1rem; font-weight: 600; margin: 0 0 1rem; color: var(--color-fg-muted); text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.75rem; }
    .chart-section, .referers-section { background: var(--color-canvas-subtle); border: 1px solid var(--color-border-default); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
    .bar-chart { display: flex; align-items: flex-end; gap: 4px; height: 160px; padding-bottom: 2rem; position: relative; }
    .bar-column { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
    .bar-fill { width: 100%; background: linear-gradient(180deg, #58a6ff 0%, #388bfd 100%); border-radius: 4px 4px 0 0; transition: height 0.5s ease; min-height: 2px; }
    .bar-label { font-size: 0.6rem; color: var(--color-fg-muted); margin-top: 4px; }
    .referer-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .referer-item { display: flex; align-items: center; gap: 1rem; }
    .referer-bar-wrapper { flex: 1; height: 8px; background: var(--color-border-muted); border-radius: 4px; overflow: hidden; }
    .referer-bar { height: 100%; background: linear-gradient(90deg, #58a6ff, #388bfd); border-radius: 4px; transition: width 0.6s ease; }
    .referer-url { font-size: 0.875rem; color: var(--color-fg-default); min-width: 0; flex: 0 0 auto; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .referer-count { font-size: 0.75rem; }
    .empty-state-container { text-align: center; padding: 4rem 2rem; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
    .empty-title { font-size: 1.125rem; font-weight: 600; margin: 0 0 0.5rem; }
    .empty-subtitle { color: var(--color-fg-muted); margin: 0; }
    .empty-referers { text-align: center; padding: 1rem; color: var(--color-fg-muted); font-size: 0.875rem; }
  `]
})
export class AnalyticsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private pasteSvc = inject(PasteService);

  pasteId = signal('');
  data = signal<PasteAnalytics | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  hourlyData = computed(() => (this.data()?.hourly ?? []).slice().reverse());
  maxHourly = computed(() => Math.max(...(this.data()?.hourly ?? []).map(h => h.event_count), 1));

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.pasteId.set(id);
    this.pasteSvc.getAnalytics(id).subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: (err) => { this.error.set(err?.error?.detail ?? 'Failed to load analytics'); this.loading.set(false); }
    });
  }
}
