import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { PasteService } from '../../core/services/paste.service';
import { ToastService } from '../../core/services/toast.service';
import { HighlightService } from '../../shared/services/highlight.service';
import { CryptoService } from '../../core/services/crypto.service';
import { SafeHtmlPipe } from '../../shared/pipes/safe-html.pipe';
import { PasteWithBody } from '../../core/models/api.models';
import { formatBytes, timeAgo, timeUntil } from '../../shared/utils/format';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-paste-view',
  standalone: true,
  imports: [CommonModule, RouterLink, SafeHtmlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <!-- Skeleton loader -->
      <div class="space-y-4 animate-fadeIn">
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-2 flex-1">
            <div class="skeleton h-7 w-56 rounded"></div>
            <div class="skeleton h-4 w-96 rounded"></div>
          </div>
          <div class="skeleton h-8 w-28 rounded-md"></div>
        </div>
        <div class="card overflow-hidden">
          <div class="skeleton h-10 rounded-none"></div>
          <div class="space-y-1.5 p-4">
            @for (_ of [1,2,3,4,5,6,7,8]; track $index) {
              <div class="skeleton rounded" [style.width]="(60 + $index * 5 % 40) + '%'" style="height:16px"></div>
            }
          </div>
        </div>
      </div>
    } @else if (notFound()) {
      <div class="flex items-center justify-center min-h-[50vh]">
        <div class="text-center space-y-4 animate-fadeInUp">
          <div class="text-5xl">🔥</div>
          <h1 class="text-xl font-semibold" style="color:rgb(var(--foreground))">Paste not found</h1>
          <p class="text-sm" style="color:rgb(var(--muted-foreground))">It may have expired, been deleted, or burned after reading.</p>
          <a routerLink="/" class="btn-primary inline-flex">
            <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"/></svg>
            New paste
          </a>
        </div>
      </div>
    } @else if (paste()) {
      @let p = paste()!;
      <div class="space-y-4 animate-fadeInUp">
        <!-- Meta row -->
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 class="text-lg font-semibold leading-tight" style="color:rgb(var(--foreground))">{{ p.title }}</h1>
            <p class="text-xs mt-1" style="color:rgb(var(--muted-foreground))">
              Created {{ timeAgo(p.created_at) }}
              &middot; {{ formatBytes(p.size_bytes) }}
              &middot; {{ p.view_count }} {{ p.view_count === 1 ? 'view' : 'views' }}
            </p>
          </div>
          <!-- Badges -->
          <div class="flex flex-wrap gap-1.5 items-center">
            <span class="badge-blue font-mono">{{ p.language }}</span>
            <span class="badge">{{ p.visibility }}</span>
            @if (p.burn_after_read) { <span class="badge-red">🔥 burned</span> }
            @if (p.is_encrypted)    { <span class="badge-purple">🔒 encrypted</span> }
            @if (p.zk_encrypted)    { <span class="badge-purple">🔐 zero-knowledge</span> }
            @if (countdown()) { <span class="badge-green">⏱ {{ countdown() }}</span> }
          </div>
        </div>

        <!-- Code block -->
        <div class="card overflow-hidden" style="background:#0d1117; border-color:#30363d;">
          <!-- Code toolbar -->
          <div class="flex items-center justify-between px-4 py-2.5 border-b"
               style="background:#161b22; border-color:#30363d;">
            <div class="flex items-center gap-2">
              <svg class="w-3.5 h-3.5" style="color:#8b949e" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 1.75C4 .784 4.784 0 5.75 0h5.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v8.586A1.75 1.75 0 0 1 14.25 15h-8.5A1.75 1.75 0 0 1 4 13.25Zm1.75-.25a.25.25 0 0 0-.25.25v11.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 10 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688Z"/>
              </svg>
              <span class="text-xs font-mono" style="color:#8b949e">{{ p.id }}</span>
            </div>
            <div class="flex items-center gap-2">
              <!-- Copy button with micro-delight -->
              <button class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-all duration-200"
                      [style]="justCopied() ?
                        'background:rgba(87,171,90,0.15);border-color:rgba(87,171,90,0.4);color:#57ab5a;' :
                        'background:rgba(255,255,255,0.04);border-color:#30363d;color:#8b949e;'"
                      type="button"
                      (click)="copy(p.content)">
                @if (justCopied()) {
                  <svg class="w-3.5 h-3.5 animate-checkPop" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
                  </svg>
                  Copied!
                } @else {
                  <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/>
                    <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/>
                  </svg>
                  Copy
                }
              </button>
              <!-- Raw link -->
              <a class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-all duration-200"
                 style="background:rgba(255,255,255,0.04);border-color:#30363d;color:#8b949e;"
                 [href]="rawUrl(p.id)" target="_blank" rel="noopener"
                 onmouseenter="this.style.color='#c9d1d9';this.style.borderColor='#8b949e';"
                 onmouseleave="this.style.color='#8b949e';this.style.borderColor='#30363d';">
                <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L7.5 6.44l2.72-2.72a.75.75 0 1 1 1.06 1.06L8.56 7.5l2.72 2.72a.75.75 0 1 1-1.06 1.06L7.5 8.56l-2.72 2.72a.75.75 0 0 1-1.06-1.06L6.44 7.5 3.72 4.78a.75.75 0 0 1 0-1.06Z"/>
                </svg>
                Raw
              </a>
              <!-- Fork button -->
              <button class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-all duration-200"
                      style="background:rgba(255,255,255,0.04);border-color:#30363d;color:#8b949e;"
                      type="button" (click)="fork(p.id)"
                      onmouseenter="this.style.color='#c9d1d9';this.style.borderColor='#8b949e';"
                      onmouseleave="this.style.color='#8b949e';this.style.borderColor='#30363d';">
                <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"/></svg>
                Fork
              </button>
              <!-- Diff link -->
              @if (p.parent_id) {
                <a [routerLink]="['/p', p.id, 'diff']"
                   class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-all duration-200"
                   style="background:rgba(255,255,255,0.04);border-color:#30363d;color:#8b949e;"
                   onmouseenter="this.style.color='#c9d1d9';this.style.borderColor='#8b949e';"
                   onmouseleave="this.style.color='#8b949e';this.style.borderColor='#30363d';">
                  Diff
                </a>
              }
              <!-- Analytics link -->
              <a [routerLink]="['/p', p.id, 'analytics']"
                 class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-all duration-200"
                 style="background:rgba(255,255,255,0.04);border-color:#30363d;color:#8b949e;"
                 onmouseenter="this.style.color='#c9d1d9';this.style.borderColor='#8b949e';"
                 onmouseleave="this.style.color='#8b949e';this.style.borderColor='#30363d';">
                📊
              </a>
              <!-- New paste -->
              <a routerLink="/"
                 class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-all duration-200"
                 style="background:rgba(88,166,255,0.1);border-color:rgba(88,166,255,0.3);color:#58a6ff;"
                 onmouseenter="this.style.background='rgba(88,166,255,0.2)'"
                 onmouseleave="this.style.background='rgba(88,166,255,0.1)'">
                <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"/></svg>
                New
              </a>
            </div>
          </div>

          <!-- Highlighted code with line numbers -->
          <div class="paste-code-block">
            <table>
              @for (line of renderedLines(); track $index) {
                <tr>
                  <td class="ln">{{ $index + 1 }}</td>
                  <td class="lc" [innerHTML]="line | safeHtml"></td>
                </tr>
              }
            </table>
          </div>
        </div>
      </div>
    }
  `,
})
export class PasteViewComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(PasteService);
  private toast = inject(ToastService);
  private hlSvc = inject(HighlightService);
  private cryptoSvc = inject(CryptoService);

  readonly paste = signal<PasteWithBody | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly justCopied = signal(false);
  readonly countdown = signal('');
  readonly decryptedContent = signal<string | null>(null);

  readonly renderedLines = computed(() => {
    const p = this.paste();
    if (!p) return [];
    const content = this.decryptedContent() ?? p.content;
    const highlighted = this.hlSvc.highlight(content, p.language);
    return highlighted.split('\n');
  });

  private timer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.loading.set(false); this.notFound.set(true); return; }
    this.svc.get(id).subscribe({
      next: (p) => {
        this.paste.set(p);
        this.loading.set(false);
        this.tickCountdown();
        this.timer = setInterval(() => this.tickCountdown(), 1000);
        if (p.zk_encrypted) {
          this.tryZkDecrypt(p.content);
        }
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 404) { this.notFound.set(true); }
        else {
          const detail = err?.error?.detail;
          this.toast.error(typeof detail === 'string' ? detail : 'Failed to load paste');
        }
      },
    });
  }

  private async tryZkDecrypt(ciphertext: string): Promise<void> {
    try {
      const hash = window.location.hash;
      if (!hash.startsWith('#key=')) return;
      const fragment = hash.slice(5); // remove '#key='
      const dotIdx = fragment.lastIndexOf('.');
      if (dotIdx < 0) return;
      const keyB64 = fragment.slice(0, dotIdx);
      const ivB64 = fragment.slice(dotIdx + 1);
      const cryptoKey = await this.cryptoSvc.importKeyFromBase64(keyB64);
      const plaintext = await this.cryptoSvc.decrypt(ciphertext, ivB64, cryptoKey);
      this.decryptedContent.set(plaintext);
      this.toast.success('🔐 Zero-knowledge decryption successful');
    } catch {
      this.toast.error('Decryption failed — key may be invalid or missing.');
    }
  }

  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }

  copy(content: string): void {
    const text = this.decryptedContent() ?? content;
    navigator.clipboard.writeText(text).then(
      () => {
        this.justCopied.set(true);
        this.toast.success('Copied to clipboard!');
        setTimeout(() => this.justCopied.set(false), 2000);
      },
      () => this.toast.error('Could not copy to clipboard'),
    );
  }

  fork(id: string): void {
    this.svc.fork(id).subscribe({
      next: (forked) => {
        this.toast.success(`Forked! New paste: ${forked.id}`);
        this.router.navigate(['/p', forked.id]);
      },
      error: (err) => this.toast.error(err?.error?.detail ?? 'Could not fork paste.')
    });
  }

  rawUrl(id: string): string { return `${environment.apiBaseUrl}/pastes/${id}/raw`; }

  formatBytes = formatBytes;
  timeAgo = timeAgo;

  private tickCountdown(): void {
    const p = this.paste();
    this.countdown.set(timeUntil(p?.expires_at ?? null));
  }
}
