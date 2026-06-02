import { formatBytes, timeAgo, timeUntil } from './format';

describe('format utils', () => {
  it('formatBytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(1024 * 1024 * 3)).toBe('3.00 MB');
  });

  it('timeAgo handles null', () => {
    expect(timeAgo(null)).toBe('—');
  });

  it('timeUntil for past returns Expired', () => {
    expect(timeUntil(new Date(Date.now() - 1000).toISOString())).toBe('Expired');
  });

  it('timeUntil for null returns Never expires', () => {
    expect(timeUntil(null)).toBe('Never expires');
  });
});
