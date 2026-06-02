import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PasteService } from './paste.service';
import { Paste } from '../models/api.models';

describe('PasteService', () => {
  let svc: PasteService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PasteService],
    });
    svc = TestBed.inject(PasteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /pastes for current user', () => {
    const fake: Paste[] = [];
    svc.listMine().subscribe((res) => expect(res).toEqual(fake));
    const req = http.expectOne('/api/v1/pastes?limit=50&offset=0');
    expect(req.request.method).toBe('GET');
    req.flush(fake);
  });

  it('POST /pastes creates a paste', () => {
    svc
      .create({
        title: 't',
        content: 'hi',
        language: 'plaintext',
        visibility: 'public',
        burn_after_read: false,
        expiration: 'never',
        encrypt: false,
      })
      .subscribe((res) => expect(res.id).toBe('abc123'));
    const req = http.expectOne('/api/v1/pastes');
    expect(req.request.method).toBe('POST');
    req.flush({
      id: 'abc123',
      title: 't',
      language: 'plaintext',
      size_bytes: 2,
      visibility: 'public',
      burn_after_read: false,
      is_encrypted: false,
      view_count: 0,
      expires_at: null,
      created_at: new Date().toISOString(),
      owner_id: null,
    });
  });

  it('DELETE /pastes/:id', () => {
    svc.delete('xyz').subscribe();
    const req = http.expectOne('/api/v1/pastes/xyz');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
