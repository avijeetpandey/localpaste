import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ThemeService } from '../../core/services/theme.service';

type Mode = 'login' | 'register';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex items-center justify-center px-4"
         [class.dark]="theme.isDark()"
         style="background:rgb(var(--background));">

      <!-- Theme toggle top-right -->
      <button class="btn-icon fixed top-4 right-4" (click)="theme.toggle()" title="Toggle theme">
        @if (theme.isDark()) {
          <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" style="color:rgb(var(--muted-foreground))">
            <path d="M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-1.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0Z"/>
          </svg>
        } @else {
          <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" style="color:rgb(var(--muted-foreground))">
            <path d="M9.598 1.591a.749.749 0 0 1 .785-.175 7.001 7.001 0 1 1-8.967 8.967.75.75 0 0 1 .961-.96 5.5 5.5 0 0 0 7.046-7.046.75.75 0 0 1 .175-.786Z"/>
          </svg>
        }
      </button>

      <div class="w-full max-w-sm animate-fadeInUp">
        <!-- Logo -->
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
               style="background:linear-gradient(135deg,rgb(var(--primary)) 0%,#a371f7 100%);">
            <svg class="w-6 h-6 text-white" viewBox="0 0 16 16" fill="currentColor">
              <path d="M9.5 3.25a.25.25 0 0 1 .25-.25h5a.25.25 0 0 1 .25.25v5a.25.25 0 0 1-.25.25h-5a.25.25 0 0 1-.25-.25v-5Z"/>
              <path d="M1 1.75A.75.75 0 0 1 1.75 1h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 1.75Zm0 5A.75.75 0 0 1 1.75 6h3.5a.75.75 0 0 1 0 1.5h-3.5A.75.75 0 0 1 1 6.75Zm0 5A.75.75 0 0 1 1.75 11h3.5a.75.75 0 0 1 0 1.5h-3.5A.75.75 0 0 1 1 11.75Z"/>
            </svg>
          </div>
          <h1 class="text-xl font-semibold" style="color:rgb(var(--foreground))">localpaste</h1>
          <p class="text-sm mt-1" style="color:rgb(var(--muted-foreground))">
            {{ mode() === 'login' ? 'Sign in to your account' : 'Create a new account' }}
          </p>
        </div>

        <!-- Card -->
        <div class="card rounded-xl p-6 space-y-4">
          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3" autocomplete="on">
            @if (mode() === 'register') {
              <div class="space-y-1 animate-fadeIn">
                <label class="label" for="username">Username</label>
                <input id="username" class="input" type="text" formControlName="username"
                       autocomplete="username" placeholder="octocat"
                       [style.border-color]="form.controls.username.touched && form.controls.username.invalid ? 'rgb(var(--destructive))' : ''" />
                @if (form.controls.username.touched && form.controls.username.invalid) {
                  <p class="text-xs mt-0.5" style="color:rgb(var(--destructive))">3–64 characters, letters / numbers / . _ -</p>
                }
              </div>
            }

            <div class="space-y-1">
              <label class="label" for="email">Email address</label>
              <input id="email" class="input" type="email" formControlName="email"
                     autocomplete="email" placeholder="you@example.com"
                     [style.border-color]="form.controls.email.touched && form.controls.email.invalid ? 'rgb(var(--destructive))' : ''" />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <p class="text-xs mt-0.5" style="color:rgb(var(--destructive))">Enter a valid email address.</p>
              }
            </div>

            <div class="space-y-1">
              <label class="label" for="password">Password</label>
              <input id="password" class="input" type="password" formControlName="password"
                     [autocomplete]="mode() === 'login' ? 'current-password' : 'new-password'"
                     placeholder="••••••••"
                     [style.border-color]="form.controls.password.touched && form.controls.password.invalid ? 'rgb(var(--destructive))' : ''" />
              @if (form.controls.password.touched && form.controls.password.invalid) {
                <p class="text-xs mt-0.5" style="color:rgb(var(--destructive))">Minimum 8 characters.</p>
              }
            </div>

            <button class="btn-primary w-full h-9 mt-1" type="submit" [disabled]="form.invalid || submitting()">
              @if (submitting()) {
                <span class="spinner mr-2"></span>
                <span>Please wait…</span>
              } @else {
                {{ mode() === 'login' ? 'Sign in' : 'Create account' }}
              }
            </button>
          </form>
        </div>

        <!-- Switch mode -->
        <p class="text-center text-sm mt-4" style="color:rgb(var(--muted-foreground))">
          @if (mode() === 'login') {
            New to localpaste?
            <button type="button" class="font-medium transition-colors duration-150 hover:underline"
                    style="color:rgb(var(--primary))" (click)="switch('register')">Create an account</button>
          } @else {
            Already have an account?
            <button type="button" class="font-medium transition-colors duration-150 hover:underline"
                    style="color:rgb(var(--primary))" (click)="switch('login')">Sign in</button>
          }
        </p>

        <!-- Demo hint -->
        <div class="mt-4 p-3 rounded-lg border text-center text-xs"
             style="background:rgb(var(--accent)); border-color:rgb(var(--primary)/0.25); color:rgb(var(--muted-foreground))">
          <span class="font-medium" style="color:rgb(var(--foreground))">Demo accounts</span><br/>
          <code class="font-mono">demo&#64;localpaste.dev</code> / <code class="font-mono">demo12345</code>
        </div>
      </div>
    </div>
  `,
})
export class AuthPageComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  readonly theme = inject(ThemeService);

  readonly mode = signal<Mode>('login');
  readonly submitting = signal(false);

  readonly form = this.fb.group({
    username: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_.-]+$/)]),
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    password: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(8)]),
  });

  constructor() { this.applyModeValidators(); }

  switch(next: Mode): void { this.mode.set(next); this.applyModeValidators(); }

  private applyModeValidators(): void {
    const usernameCtl = this.form.controls.username;
    if (this.mode() === 'register') usernameCtl.enable({ emitEvent: false });
    else usernameCtl.disable({ emitEvent: false });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const { email, password, username } = this.form.getRawValue();
    const obs = this.mode() === 'login'
      ? this.auth.login({ email, password })
      : this.auth.register({ email, password, username });
    obs.subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.success(this.mode() === 'login' ? 'Welcome back!' : 'Account created.');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.submitting.set(false);
        const detail = err?.error?.detail;
        this.toast.error(typeof detail === 'string' ? detail : 'Authentication failed');
      },
    });
  }
}
