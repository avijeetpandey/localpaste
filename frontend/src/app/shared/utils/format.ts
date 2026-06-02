/** Format an ISO timestamp into a relative-time string (e.g. "5m ago"). */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - then) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo ago`;
  return `${Math.floor(diff / 31536000)}y ago`;
}

/** Format a "time until" countdown for an expiry timestamp. */
export function timeUntil(iso: string | null | undefined): string {
  if (!iso) return 'Never expires';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.floor((then - now) / 1000);
  if (diff <= 0) return 'Expired';
  if (diff < 60) return `Expires in ${diff}s`;
  if (diff < 3600) return `Expires in ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `Expires in ${Math.floor(diff / 3600)}h`;
  return `Expires in ${Math.floor(diff / 86400)}d`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
