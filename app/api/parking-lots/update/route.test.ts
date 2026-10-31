import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock getErrorMessage
vi.mock('@/lib/error', () => ({
  getErrorMessage: (err: any) => err?.message || 'Error',
}));

describe('POST /api/parking-lots/update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake-url.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-role-key';
  });

  it('fails if not authenticated', async () => {
    const req = new Request('http://localhost:3000/api/parking-lots/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parkingLotId: '123',
        updateData: { capacity: 50 },
      }),
    });

    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toBe('No autenticado');
  });
});
