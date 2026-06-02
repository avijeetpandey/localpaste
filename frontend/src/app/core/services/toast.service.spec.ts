import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let svc: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(ToastService);
  });

  it('adds and dismisses toasts', () => {
    svc.success('hello', 0);
    expect(svc.toasts().length).toBe(1);
    svc.dismiss(svc.toasts()[0].id);
    expect(svc.toasts().length).toBe(0);
  });

  it('auto-dismisses after ttl', (done) => {
    svc.info('temp', 30);
    expect(svc.toasts().length).toBe(1);
    setTimeout(() => {
      expect(svc.toasts().length).toBe(0);
      done();
    }, 80);
  });
});
