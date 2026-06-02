import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Workspace, WorkspaceCreate, WorkspaceMember, InviteMember, WorkspaceRole } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/workspaces`;

  list(): Observable<Workspace[]> { return this.http.get<Workspace[]>(this.base); }
  create(payload: WorkspaceCreate): Observable<Workspace> { return this.http.post<Workspace>(this.base, payload); }
  get(slug: string): Observable<{ workspace: Workspace; members: WorkspaceMember[] }> { return this.http.get<{ workspace: Workspace; members: WorkspaceMember[] }>(`${this.base}/${slug}`); }
  invite(slug: string, payload: InviteMember): Observable<WorkspaceMember> { return this.http.post<WorkspaceMember>(`${this.base}/${slug}/members`, payload); }
  updateMember(slug: string, userId: string, role: WorkspaceRole): Observable<WorkspaceMember> { return this.http.patch<WorkspaceMember>(`${this.base}/${slug}/members/${userId}`, { role }); }
  removeMember(slug: string, userId: string): Observable<void> { return this.http.delete<void>(`${this.base}/${slug}/members/${userId}`); }
  delete(slug: string): Observable<void> { return this.http.delete<void>(`${this.base}/${slug}`); }
}
