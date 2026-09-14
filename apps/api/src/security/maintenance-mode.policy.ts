const ALWAYS_AVAILABLE_PREFIXES = [
  '/health',
  '/config/public',
  '/auth/admin',
  '/admin',
] as const;

function withoutQuery(value: string): string {
  return value.split('?', 1)[0] ?? value;
}

export function normalizeApiPath(value: string): string {
  let path = withoutQuery(value || '/');
  if (!path.startsWith('/')) path = `/${path}`;
  if (path === '/api/v1') return '/';
  if (path.startsWith('/api/v1/')) path = path.slice('/api/v1'.length);
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

export function isMaintenanceBypassRoute(pathOrUrl: string, method = 'GET'): boolean {
  if (method.toUpperCase() === 'OPTIONS') return true;
  const path = normalizeApiPath(pathOrUrl);
  return ALWAYS_AVAILABLE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
