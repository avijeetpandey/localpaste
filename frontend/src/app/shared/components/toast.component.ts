import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-container">
      @for (t of toasts(); track t.id) {
        <div class="toast" [class]="t.kind" (click)="dismiss(t.id)">
          <!-- Icon -->
          <span class="toast-icon">
            @if (t.kind === 'success') {
              <svg class="w-4 h-4 animate-checkPop" style="color:#3fb950" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm3.78-9.72a.751.751 0 0 0-.018-1.042.751.751 0 0 0-1.042-.018L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5Z"/>
              </svg>
            } @else if (t.kind === 'error') {
              <svg class="w-4 h-4" style="color:rgb(var(--destructive))" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16ZM6.8 5a.75.75 0 0 0-1.5 0 .75.75 0 0 0 .75.75h1.5a.75.75 0 0 0 0-1.5H6.8ZM8 7.5a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0v-3.5A.75.75 0 0 0 8 7.5ZM8 5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/>
              </svg>
            } @else {
              <svg class="w-4 h-4" style="color:rgb(var(--primary))" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm0-11.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm0 3.5a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0v-3.5A.75.75 0 0 0 8 8Z"/>
              </svg>
            }
          </span>
          <span class="toast-msg">{{ t.message }}</span>
          <!-- Progress bar auto-dismiss -->
          <div class="toast-progress" [style.animation-duration]="'3s'"
               style="animation: toastProgress 3s linear forwards;"></div>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  private svc = inject(ToastService);
  readonly toasts = this.svc.toasts;
  dismiss(id: number): void { this.svc.dismiss(id); }
}
