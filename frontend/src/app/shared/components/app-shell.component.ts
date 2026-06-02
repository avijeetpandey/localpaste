import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthStore } from '../../core/services/auth.store';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col" [class.dark]="isDark()">
      <!-- Header -->
      <header class="sticky top-0 z-30 border-b backdrop-blur-md"
              style="background:rgb(var(--background)/0.85); border-color:rgb(var(--border));">
        <div class="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          <!-- Logo -->
          <a routerLink="/" class="flex items-center gap-2 select-none group">
            <span class="flex items-center justify-center w-7 h-7 rounded-md text-white text-xs font-bold
                         transition-transform duration-200 group-hover:scale-110"
                  style="background:linear-gradient(135deg,rgb(var(--primary)) 0%,#a371f7 100%);">
              LP
            </span>
            <span class="text-sm font-semibold tracking-tight" style="color:rgb(var(--foreground))">localpaste</span>
          </a>

          <!-- Nav links -->
          <nav class="hidden md:flex items-center gap-1">
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" class="nav-link">
              <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M9.5 3.25a.25.25 0 0 1 .25-.25h5a.25.25 0 0 1 .25.25v5a.25.25 0 0 1-.25.25h-5a.25.25 0 0 1-.25-.25v-5Z"/>
                <path d="M1 1.75A.75.75 0 0 1 1.75 1h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 1.75Zm0 5A.75.75 0 0 1 1.75 6h3.5a.75.75 0 0 1 0 1.5h-3.5A.75.75 0 0 1 1 6.75Zm0 5A.75.75 0 0 1 1.75 11h3.5a.75.75 0 0 1 0 1.5h-3.5A.75.75 0 0 1 1 11.75Z"/>
              </svg>
              New paste
            </a>
            <a routerLink="/dashboard" routerLinkActive="active" class="nav-link">
              <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8V1.5Z"/>
              </svg>
              Dashboard
            </a>
            <a routerLink="/workspaces" routerLinkActive="active" class="nav-link">
              <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 1.5h4v4h-4V1.5Zm0 9h4v4h-4v-4Zm9-9h4v4h-4V1.5Zm0 9h4v4h-4v-4ZM6.25 3.5h3.5M6.25 12.5h3.5M3.5 6.25v3.5M12.5 6.25v3.5"/></svg>
              Workspaces
            </a>
            <a routerLink="/webhooks" routerLinkActive="active" class="nav-link">
              <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M7.775 3.275a.75.75 0 0 0 1.06 1.06l1.25-1.25a2 2 0 1 1 2.83 2.83l-2.5 2.5a2 2 0 0 1-2.83 0 .75.75 0 0 0-1.06 1.06 3.5 3.5 0 0 0 4.95 0l2.5-2.5a3.5 3.5 0 0 0-4.95-4.95l-1.25 1.25Zm-4.69 9.64a2 2 0 0 1 0-2.83l2.5-2.5a2 2 0 0 1 2.83 0 .75.75 0 0 0 1.06-1.06 3.5 3.5 0 0 0-4.95 0l-2.5 2.5a3.5 3.5 0 0 0 4.95 4.95l1.25-1.25a.75.75 0 0 0-1.06-1.06l-1.25 1.25a2 2 0 0 1-2.83 0Z"/></svg>
              Webhooks
            </a>
          </nav>

          <div class="flex items-center gap-1.5">
            <!-- Theme toggle -->
            <button class="btn-icon" (click)="toggleTheme()" title="Toggle theme">
              @if (isDark()) {
                <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-1.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0ZM8 13a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 13ZM2.343 2.343a.75.75 0 0 1 1.061 0l1.06 1.061a.75.75 0 0 1-1.06 1.06L2.343 3.404a.75.75 0 0 1 0-1.06Zm9.193 9.193a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 0 1-1.06 1.061l-1.061-1.06a.75.75 0 0 1 0-1.061ZM0 8a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 8Zm13 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 13 8Z"/>
                </svg>
              } @else {
                <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M9.598 1.591a.749.749 0 0 1 .785-.175 7.001 7.001 0 1 1-8.967 8.967.75.75 0 0 1 .961-.96 5.5 5.5 0 0 0 7.046-7.046.75.75 0 0 1 .175-.786Zm1.616 1.945a7 7 0 0 1-7.678 7.678 5.499 5.499 0 1 0 7.678-7.678Z"/>
                </svg>
              }
            </button>

            <!-- User menu -->
            <div class="relative">
              <button class="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium border
                             transition-all duration-150 hover:border-primary/40"
                      style="border-color:rgb(var(--border)); background:rgb(var(--card)); color:rgb(var(--foreground));"
                      (click)="toggleMenu()">
                <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style="background:linear-gradient(135deg,rgb(var(--primary)) 0%,#a371f7 100%);">
                  {{ initials() }}
                </span>
                <span class="hidden sm:inline">{{ user()?.username }}</span>
                <svg class="w-3 h-3 opacity-60" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4.427 7.427a.25.25 0 0 0 .354 0L8 4.207l3.219 3.22a.25.25 0 0 0 .354-.354l-3.5-3.5a.25.25 0 0 0-.354 0l-3.5 3.5a.25.25 0 0 0 0 .354ZM8 11.793l3.219-3.22a.25.25 0 0 1 .354.354l-3.5 3.5a.25.25 0 0 1-.354 0l-3.5-3.5a.25.25 0 0 1 .354-.354L8 11.793Z"/>
                </svg>
              </button>
              @if (menuOpen()) {
                <div class="absolute right-0 mt-1.5 w-56 card border rounded-xl shadow-xl overflow-hidden animate-slideDown z-50"
                     (click)="menuOpen.set(false)">
                  <div class="px-3 py-2.5 border-b" style="border-color:rgb(var(--border)); background:rgb(var(--card-subtle))">
                    <div class="text-xs font-medium" style="color:rgb(var(--muted-foreground))">Signed in as</div>
                    <div class="text-sm font-semibold truncate mt-0.5">{{ user()?.email }}</div>
                  </div>
                  <div class="p-1">
                    <a routerLink="/dashboard"
                       class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-100 cursor-pointer"
                       style="color:rgb(var(--foreground));"
                       onmouseenter="this.style.background='rgb(var(--muted))'"
                       onmouseleave="this.style.background=''">
                      <svg class="w-3.5 h-3.5 opacity-70" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8V1.5Z"/></svg>
                      My pastes
                    </a>
                    <button (click)="logout()"
                            class="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-100 cursor-pointer"
                            style="color:rgb(var(--destructive));"
                            onmouseenter="this.style.background='rgb(var(--muted))'"
                            onmouseleave="this.style.background=''">
                      <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M2 2.75C2 1.784 2.784 1 3.75 1h5.5a.75.75 0 0 1 0 1.5h-5.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h5.5a.75.75 0 0 1 0 1.5h-5.5A1.75 1.75 0 0 1 2 13.25Zm8.22 5.22a.75.75 0 0 1 1.06 0l3 3a.75.75 0 0 1-1.06 1.06l-1.72-1.72V13.5a.75.75 0 0 1-1.5 0V7.25a.75.75 0 0 1 1.5 0v2.19l1.72-1.72Z" clip-rule="evenodd"/></svg>
                      Sign out
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 max-w-screen-xl mx-auto w-full px-4 py-6 page-enter">
        <router-outlet></router-outlet>
      </main>

      <footer class="border-t py-4" style="border-color:rgb(var(--border));">
        <div class="max-w-screen-xl mx-auto px-4 text-xs flex justify-between" style="color:rgb(var(--muted-foreground))">
          <span>localpaste &middot; self-hosted pastebin</span>
          <span>v1.0.0</span>
        </div>
      </footer>
    </div>
  `,
})
export class AppShellComponent {
  private authStore = inject(AuthStore);
  private auth = inject(AuthService);
  private themeSvc = inject(ThemeService);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly user = this.authStore.user;
  readonly isDark = this.themeSvc.isDark;
  readonly menuOpen = signal(false);
  readonly initials = computed(() => {
    const u = this.user();
    if (!u) return '??';
    return u.username.slice(0, 2).toUpperCase();
  });

  toggleTheme(): void { this.themeSvc.toggle(); }
  toggleMenu(): void { this.menuOpen.update((v) => !v); }
  logout(): void {
    this.auth.logout();
    this.toast.info('Signed out');
    this.router.navigate(['/auth']);
  }
}
