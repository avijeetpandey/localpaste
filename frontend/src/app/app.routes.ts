import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/auth-page.component').then((m) => m.AuthPageComponent),
    title: 'Sign in - localpaste',
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/editor/editor.component').then((m) => m.EditorComponent),
        title: 'New paste - localpaste',
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        title: 'Dashboard - localpaste',
      },
      {
        path: 'p/:id',
        loadComponent: () => import('./features/paste-view/paste-view.component').then((m) => m.PasteViewComponent),
      },
      {
        path: 'p/:id/analytics',
        loadComponent: () => import('./features/analytics/analytics.component').then((m) => m.AnalyticsComponent),
        title: 'Analytics - localpaste',
      },
      {
        path: 'p/:id/diff',
        loadComponent: () => import('./features/diff-view/diff-view.component').then((m) => m.DiffViewComponent),
        title: 'Diff - localpaste',
      },
      {
        path: 'webhooks',
        loadComponent: () => import('./features/webhooks/webhooks.component').then((m) => m.WebhooksComponent),
        title: 'Webhooks - localpaste',
      },
      {
        path: 'workspaces',
        loadComponent: () => import('./features/workspaces/workspaces.component').then((m) => m.WorkspacesComponent),
        title: 'Workspaces - localpaste',
      },
      {
        path: 'workspaces/:slug',
        loadComponent: () => import('./features/workspaces/workspace-detail.component').then((m) => m.WorkspaceDetailComponent),
        title: 'Workspace - localpaste',
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
