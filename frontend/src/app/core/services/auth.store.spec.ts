import { TestBed } from '@angular/core/testing';
import { AuthStore } from './auth.store';
import { User } from '../models/api.models';

describe('AuthStore', () => {
  let store: AuthStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(AuthStore);
  });

  it('starts with no session', () => {
    expect(store.token()).toBeNull();
    expect(store.user()).toBeNull();
    expect(store.isAuthenticated()).toBeFalse();
  });

  it('persists session via setSession', () => {
    const user: User = {
      id: 'abc',
      email: 'x@y.z',
      username: 'x',
      is_active: true,
      is_admin: false,
      created_at: new Date().toISOString(),
    };
    store.setSession('tok-123', user);
    expect(store.token()).toBe('tok-123');
    expect(store.user()?.username).toBe('x');
    expect(store.isAuthenticated()).toBeTrue();
    expect(localStorage.getItem('localpaste:token')).toBe('tok-123');
  });

  it('clears session', () => {
    store.setSession('tok', {
      id: 'abc',
      email: 'x@y.z',
      username: 'x',
      is_active: true,
      is_admin: false,
      created_at: '',
    });
    store.clear();
    expect(store.token()).toBeNull();
    expect(localStorage.getItem('localpaste:token')).toBeNull();
  });
});
