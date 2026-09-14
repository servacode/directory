import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('AdminApi session boundary', () => {
  it('keeps refresh credentials in the HttpOnly cookie flow and only tracks access auth in memory', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test/api/v1');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        user: { id:'00000000-0000-4000-8000-000000000001', fullName:'Admin', phone:'+963987654321', provinceId:'00000000-0000-4000-8000-000000000002', status:'ACTIVE', systemRole:'ADMIN' },
        accessToken: 'access-only',
        accessTokenExpiresAt: '2026-09-15T12:00:00.000Z',
      }), { status: 200, headers: { 'content-type':'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok:true }), { status: 200, headers: { 'content-type':'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const { AdminApi } = await import('./admin-api.js');
    const api = new AdminApi();
    await api.login('+963987654321', 'password123');
    expect(api.isAuthenticated()).toBe(true);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials:'include' });
    await api.logout();
    expect(api.isAuthenticated()).toBe(false);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ credentials:'include' });
  });
});
