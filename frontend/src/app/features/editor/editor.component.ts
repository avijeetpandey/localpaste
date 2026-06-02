import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { PasteService } from '../../core/services/paste.service';
import { ToastService } from '../../core/services/toast.service';
import { HighlightService } from '../../shared/services/highlight.service';
import { SafeHtmlPipe } from '../../shared/pipes/safe-html.pipe';
import { CryptoService } from '../../core/services/crypto.service';
import {
  EXPIRATION_OPTIONS,
  SUPPORTED_LANGUAGES,
  VISIBILITY_OPTIONS,
} from '../../shared/utils/options';
import {
  ExpirationOption,
  PasteCreateRequest,
  PasteVisibility,
} from '../../core/models/api.models';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SafeHtmlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4 animate-fadeInUp">
      <!-- Page title -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-semibold" style="color:rgb(var(--foreground))">New paste</h1>
          <p class="text-xs mt-0.5" style="color:rgb(var(--muted-foreground))">Paste and share code or text instantly</p>
        </div>
        <!-- Mobile settings + create -->
        <div class="md:hidden flex gap-2">
          <button class="btn-secondary" type="button" (click)="drawerOpen.set(true)">
            <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-1 0v-11A.5.5 0 0 1 8 2ZM3 5.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5Zm.5 3.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1 0-1Z"/></svg>
            Settings
          </button>
          <button class="btn-primary" type="button" (click)="submit()" [disabled]="form.invalid || submitting()">
            @if (submitting()) { <span class="spinner"></span> }
            Create
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-[1fr_264px] gap-4 items-start">
        <!-- ─── Editor card ─── -->
        <div class="card overflow-hidden flex flex-col" style="min-height:60vh;">

          <!-- Toolbar -->
          <div class="flex items-center gap-2 px-3 py-2 border-b" style="border-color:rgb(var(--border)); background:rgb(var(--card))">
            <!-- Traffic-light dots (decorative) -->
            <span class="w-3 h-3 rounded-full bg-red-400/70 border border-red-500/30"></span>
            <span class="w-3 h-3 rounded-full bg-yellow-400/70 border border-yellow-500/30"></span>
            <span class="w-3 h-3 rounded-full bg-green-400/70 border border-green-500/30"></span>
            <div class="flex-1 mx-2">
              <input
                class="w-full bg-transparent text-sm font-medium outline-none placeholder:opacity-50 transition-opacity"
                style="color:rgb(var(--foreground))"
                formControlName="title"
                [formGroup]="form"
                placeholder="Untitled paste" />
            </div>
            <span class="text-xs tabular-nums" style="color:rgb(var(--muted-foreground))">
              {{ charCount() }} ch &middot; {{ lineCount() }} ln
            </span>
          </div>

          <!-- Code area (always dark) -->
          <div class="editor-pane flex-1" style="border-radius:0; min-height:0;">
            <!-- Gutter -->
            <div class="editor-gutter" #gutterEl>{{ lineNumbersText() }}</div>
            <!-- Overlay grid -->
            <div class="code-grid flex-1">
              <!-- Highlight layer (rendered HTML) -->
              <pre class="hljs" [innerHTML]="highlightedHtml() | safeHtml"></pre>
              <!-- Transparent textarea on top -->
              <textarea
                #codeArea
                [formControl]="form.controls.content"
                placeholder="Paste or type your code here…"
                (keydown)="onKeyDown($event)"
                (scroll)="syncScroll()"
                spellcheck="false"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- ─── Settings sidebar (md+) ─── -->
        <aside class="hidden md:block sticky top-20">
          <div class="card p-4 space-y-0">
            <h2 class="text-xs font-semibold uppercase tracking-widest mb-3" style="color:rgb(var(--muted-foreground))">Settings</h2>
            <ng-container *ngTemplateOutlet="settingsTpl"></ng-container>
            <div class="pt-4">
              <button class="btn-primary w-full" type="button" (click)="submit()" [disabled]="form.invalid || submitting()">
                @if (submitting()) {
                  <span class="spinner"></span>
                  <span>Creating…</span>
                } @else {
                  <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"/></svg>
                  Create paste
                }
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <!-- ─── Mobile settings drawer ─── -->
    @if (drawerOpen()) {
      <div class="fixed inset-0 z-40 flex flex-col justify-end" (click)="drawerOpen.set(false)">
        <div class="absolute inset-0" style="background:rgba(0,0,0,0.5);backdrop-filter:blur(4px)"></div>
        <div class="relative card rounded-t-2xl rounded-b-none p-5 space-y-4 animate-fadeInUp"
             (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-sm" style="color:rgb(var(--foreground))">Settings</h2>
            <button class="btn-icon" type="button" (click)="drawerOpen.set(false)">
              <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/></svg>
            </button>
          </div>
          <ng-container *ngTemplateOutlet="settingsTpl"></ng-container>
          <button class="btn-primary w-full" type="button" (click)="drawerOpen.set(false); submit()" [disabled]="form.invalid || submitting()">
            @if (submitting()) { <span class="spinner"></span> }
            Create paste
          </button>
        </div>
      </div>
    }

    <!-- ─── Settings template ─── -->
    <ng-template #settingsTpl>
      <form [formGroup]="form" class="space-y-3">
        <div>
          <label class="label block mb-1">Language</label>
          <div class="relative">
            <select class="select-input w-full" formControlName="language">
              @for (lang of languages; track lang.value) {
                <option [value]="lang.value">{{ lang.label }}</option>
              }
            </select>
          </div>
        </div>
        <div>
          <label class="label block mb-1">Expiration</label>
          <select class="select-input w-full" formControlName="expiration">
            @for (opt of expirations; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
        </div>
        <div>
          <label class="label block mb-1">Visibility</label>
          <select class="select-input w-full" formControlName="visibility">
            @for (v of visibilities; track v.value) {
              <option [value]="v.value">{{ v.label }}</option>
            }
          </select>
        </div>
        <hr class="settings-divider" />
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium" style="color:rgb(var(--foreground))">Burn after reading</div>
            <div class="text-xs mt-0.5" style="color:rgb(var(--muted-foreground))">Deleted after first view</div>
          </div>
          <label class="toggle">
            <input type="checkbox" formControlName="burn_after_read" />
            <span class="toggle-track"></span>
            <span class="toggle-thumb"></span>
          </label>
        </div>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium" style="color:rgb(var(--foreground))">Encrypt body</div>
            <div class="text-xs mt-0.5" style="color:rgb(var(--muted-foreground))">AES-GCM at rest</div>
          </div>
          <label class="toggle">
            <input type="checkbox" formControlName="encrypt" />
            <span class="toggle-track"></span>
            <span class="toggle-thumb"></span>
          </label>
        </div>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium" style="color:rgb(var(--foreground))">Zero-Knowledge Encryption</div>
            <div class="text-xs mt-0.5" style="color:rgb(var(--muted-foreground))">Client-side AES-GCM, key in URL fragment</div>
          </div>
          <label class="toggle">
            <input type="checkbox" formControlName="zk_encrypt" />
            <span class="toggle-track"></span>
            <span class="toggle-thumb"></span>
          </label>
        </div>
      </form>
    </ng-template>
  `,
})
export class EditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('codeArea') codeAreaRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('gutterEl') gutterRef?: ElementRef<HTMLDivElement>;

  private fb = inject(FormBuilder);
  private pasteSvc = inject(PasteService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private hlSvc = inject(HighlightService);
  private cdr = inject(ChangeDetectorRef);
  private cryptoSvc = inject(CryptoService);

  readonly languages = SUPPORTED_LANGUAGES;
  readonly expirations = EXPIRATION_OPTIONS;
  readonly visibilities = VISIBILITY_OPTIONS;

  readonly drawerOpen = signal(false);
  readonly submitting = signal(false);

  readonly form = this.fb.group({
    title: this.fb.nonNullable.control('Untitled', [Validators.maxLength(255)]),
    content: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(1), Validators.maxLength(2_000_000)]),
    language: this.fb.nonNullable.control<string>('plaintext'),
    expiration: this.fb.nonNullable.control<ExpirationOption>('never'),
    visibility: this.fb.nonNullable.control<PasteVisibility>('public'),
    burn_after_read: this.fb.nonNullable.control(false),
    encrypt: this.fb.nonNullable.control(false),
    zk_encrypt: this.fb.nonNullable.control(false),
  });

  readonly contentSignal = signal('');
  readonly languageSignal = signal('plaintext');

  readonly charCount = computed(() => this.contentSignal().length);
  readonly lineCount = computed(() => Math.max(1, this.contentSignal().split('\n').length));
  readonly lineNumbersText = computed(() =>
    Array.from({ length: this.lineCount() }, (_, i) => (i + 1).toString()).join('\n'),
  );

  readonly highlightedHtml = computed(() => {
    const code = this.contentSignal() || ' ';
    return this.hlSvc.highlight(code, this.languageSignal());
  });

  private subs: ReturnType<typeof setInterval>[] = [];

  constructor() {
    this.form.controls.content.valueChanges.subscribe((v) => this.contentSignal.set(v ?? ''));
    this.form.controls.language.valueChanges.subscribe((v) => this.languageSignal.set(v ?? 'plaintext'));
  }

  ngAfterViewInit(): void { /* resize handled by CSS */ }
  ngOnDestroy(): void { this.subs.forEach(clearInterval); }

  syncScroll(): void {
    const ta = this.codeAreaRef?.nativeElement;
    const pre = ta?.previousElementSibling as HTMLPreElement | null;
    if (!ta || !pre) return;
    pre.scrollTop = ta.scrollTop;
    pre.scrollLeft = ta.scrollLeft;
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.target as HTMLTextAreaElement;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = el.value.substring(0, start) + '  ' + el.value.substring(end);
      el.value = next;
      el.selectionStart = el.selectionEnd = start + 2;
      this.form.controls.content.setValue(next);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.toast.error('Please add some content before saving.');
      return;
    }
    this.submitting.set(true);

    const rawValue = this.form.getRawValue();
    const useZk = rawValue.zk_encrypt;

    let content = rawValue.content;
    let zk_iv: string | undefined;
    let keyFragment: string | undefined;

    if (useZk) {
      try {
        const result = await this.cryptoSvc.encryptForUpload(content);
        content = result.encrypted;
        zk_iv = result.iv;
        keyFragment = result.keyFragment;
      } catch {
        this.toast.error('Failed to perform zero-knowledge encryption');
        this.submitting.set(false);
        return;
      }
    }

    const payload: PasteCreateRequest = {
      title: rawValue.title,
      content,
      language: rawValue.language,
      visibility: rawValue.visibility,
      burn_after_read: rawValue.burn_after_read,
      expiration: rawValue.expiration,
      encrypt: rawValue.encrypt,
      zk_encrypted: useZk,
      zk_iv: useZk ? zk_iv : undefined,
    };

    this.pasteSvc.create(payload).subscribe({
      next: (paste) => {
        this.submitting.set(false);
        this.toast.success('Paste created!');
        if (useZk && keyFragment && zk_iv) {
          this.router.navigate(['/p', paste.id]).then(() => {
            window.location.hash = `key=${keyFragment}.${zk_iv}`;
          });
        } else {
          this.router.navigate(['/p', paste.id]);
        }
      },
      error: (err) => {
        this.submitting.set(false);
        const detail = err?.error?.detail;
        this.toast.error(typeof detail === 'string' ? detail : 'Failed to create paste');
      },
    });
  }
}
