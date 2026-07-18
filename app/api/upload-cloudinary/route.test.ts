import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock dependencies
vi.mock('next/server', () => {
  return {
    NextResponse: {
      json: vi.fn((body, init) => {
        return { body, status: init?.status || 200 };
      }),
    },
  };
});

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn(() => ({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
      },
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'http://test.com/image.jpg' } }),
        })),
      },
    })),
  };
});

describe('upload-cloudinary POST route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, NEXT_PUBLIC_SUPABASE_URL: 'http://localhost', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key' };
  });

  const mockRequest = (body: any) => {
    return {
      json: vi.fn().mockResolvedValue(body),
      headers: {
        get: vi.fn().mockReturnValue('Bearer test-token'),
      },
    } as unknown as Request;
  };

  it('should return 400 for disallowed MIME types (e.g. SVG)', async () => {
    const req = mockRequest({ image: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' });
    const response = await POST(req);
    expect(response.status).toBe(400);
    expect((response as any).body).toEqual({ error: 'Tipo de archivo no permitido' });
  });

  it('should accept allowed MIME types (e.g. image/jpeg)', async () => {
    const req = mockRequest({ image: 'data:image/jpeg;base64,dGVzdA==' });
    const response = await POST(req);
    expect(response.status).toBe(200);
    expect((response as any).body.public_id).toBeDefined();
  });
});
