import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { createClient } from '@supabase/supabase-js';

// Mock next/server
vi.mock('next/server', () => {
  return {
    NextResponse: {
      json: vi.fn((body, init) => {
        return {
          status: init?.status ?? 200,
          json: async () => body,
        };
      }),
    },
  };
});

// Mock @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => {
  const uploadMock = vi.fn();
  const getPublicUrlMock = vi.fn();
  const getUserMock = vi.fn();

  return {
    createClient: vi.fn(() => ({
      auth: {
        getUser: getUserMock,
      },
      storage: {
        from: vi.fn(() => ({
          upload: uploadMock,
          getPublicUrl: getPublicUrlMock,
        })),
      },
    })),
    __getUserMock: getUserMock,
    __uploadMock: uploadMock,
    __getPublicUrlMock: getPublicUrlMock,
  };
});

// Access mocks
import * as supabaseMock from '@supabase/supabase-js';
const { __getUserMock, __uploadMock, __getPublicUrlMock } = supabaseMock as any;

describe('POST /api/upload-cloudinary', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_key';

    // Default happy path mocks
    __getUserMock.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    __uploadMock.mockResolvedValue({
      data: { path: 'file.jpg' },
      error: null,
    });

    __getPublicUrlMock.mockReturnValue({
      data: { publicUrl: 'https://example.com/file.jpg' },
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createRequest = (options: {
    headers?: Record<string, string>;
    body?: any;
  } = {}) => {
    const headers = new Headers(options.headers || {
      'Authorization': 'Bearer valid-token'
    });

    return {
      headers,
      json: vi.fn().mockResolvedValue(options.body || {
        image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBD...'
      })
    } as unknown as Request;
  };

  it('returns 500 if NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const request = createRequest();
    const response = await POST(request) as any;
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Missing supabaseUrl. Skipping execution.');
  });

  it('returns 401 if Authorization header is missing', async () => {
    const request = createRequest({ headers: {} });
    const response = await POST(request) as any;
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('No autenticado');
  });

  it('returns 401 if token is invalid', async () => {
    __getUserMock.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Invalid token'),
    });

    const request = createRequest();
    const response = await POST(request) as any;
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Token inválido o expirado');
  });

  it('returns 400 if image is missing from body', async () => {
    const request = createRequest({ body: {} });
    const response = await POST(request) as any;
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Falta la imagen');
  });

  it('returns 400 if image format is invalid (not base64 data url)', async () => {
    const request = createRequest({ body: { image: 'invalid-image-string' } });
    const response = await POST(request) as any;
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Formato de imagen inválido');
  });

  it('returns 400 if mime type is not allowed', async () => {
    const request = createRequest({ body: { image: 'data:image/svg+xml;base64,PHN2Zy...' } });
    const response = await POST(request) as any;
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Tipo de archivo no permitido');
  });



  it('returns 500 if Supabase upload fails', async () => {
    __uploadMock.mockResolvedValueOnce({
      data: null,
      error: new Error('Upload failed'),
    });

    const request = createRequest();
    const response = await POST(request) as any;
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Hubo un error al subir la imagen');
  });

  it('successfully uploads image and returns metadata', async () => {
    // Mock crypto.randomUUID
    const originalRandomUUID = crypto.randomUUID;
    crypto.randomUUID = vi.fn().mockReturnValue('mock-uuid-1234');

    // Mock Date.now
    const originalDateNow = Date.now;
    Date.now = vi.fn().mockReturnValue(1620000000000);

    const request = createRequest();
    const response = await POST(request) as any;
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.secure_url).toBe('https://example.com/file.jpg');
    expect(body.public_id).toBe('1620000000000-mock-uuid-1234.jpg');
    expect(body.format).toBe('jpg');
    expect(body.bytes).toBeGreaterThan(0);

    // Restore globals
    crypto.randomUUID = originalRandomUUID;
    Date.now = originalDateNow;
  });
});
