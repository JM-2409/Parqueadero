import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DELETE } from './route';

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
  const getUserMock = vi.fn();
  const selectMock = vi.fn();
  const eqMock = vi.fn();
  const singleMock = vi.fn();
  const deleteMock = vi.fn();
  const deleteEqMock = vi.fn();

  // Create chainable mocks
  const queryBuilder = {
    select: selectMock,
    eq: eqMock,
    single: singleMock,
    delete: deleteMock,
  };

  selectMock.mockReturnValue(queryBuilder);
  eqMock.mockReturnValue(queryBuilder);
  deleteMock.mockReturnValue(queryBuilder);
  deleteEqMock.mockReturnValue(queryBuilder);

  return {
    createClient: vi.fn(() => ({
      auth: {
        getUser: getUserMock,
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return queryBuilder;
        }
        if (table === 'parking_lots') {
          return {
            delete: vi.fn(() => ({
              eq: deleteEqMock,
            })),
          };
        }
        return queryBuilder;
      }),
    })),
    __getUserMock: getUserMock,
    __singleMock: singleMock,
    __deleteEqMock: deleteEqMock,
  };
});

// Access mocks
import * as supabaseMock from '@supabase/supabase-js';
const { __getUserMock, __singleMock, __deleteEqMock } = supabaseMock as any;

describe('DELETE /api/parking-lots/delete', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_key';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon_key';

    // Default happy path mocks
    __getUserMock.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    __singleMock.mockResolvedValue({
      data: { role: 'superadmin' },
      error: null,
    });

    __deleteEqMock.mockResolvedValue({
      data: null,
      error: null,
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createRequest = (url: string = 'http://localhost/api/parking-lots/delete?id=123', options: {
    headers?: Record<string, string>;
  } = {}) => {
    const headers = new Headers(options.headers || {
      'Authorization': 'Bearer valid-token'
    });

    return {
      url,
      headers,
    } as unknown as Request;
  };

  it('returns 400 if id is missing', async () => {
    const request = createRequest('http://localhost/api/parking-lots/delete');
    const response = await DELETE(request) as any;
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Faltan parámetros requeridos (id)');
  });

  it('returns 500 if database configuration is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;

    const request = createRequest();
    const response = await DELETE(request) as any;
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Configuración de base de datos incompleta');
  });

  it('returns 401 if Authorization header is missing', async () => {
    const request = createRequest('http://localhost/api/parking-lots/delete?id=123', { headers: {} });
    const response = await DELETE(request) as any;
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('No autenticado');
  });

  it('returns 401 if token is invalid or expired', async () => {
    __getUserMock.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Invalid token'),
    });

    const request = createRequest();
    const response = await DELETE(request) as any;
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Token inválido o expirado');
  });

  it('returns 401 if user profile is not found', async () => {
    __singleMock.mockResolvedValueOnce({
      data: null,
      error: new Error('User not found'),
    });

    const request = createRequest();
    const response = await DELETE(request) as any;
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Usuario no encontrado o no autorizado');
  });

  it('returns 403 if user is not a superadmin', async () => {
    __singleMock.mockResolvedValueOnce({
      data: { role: 'admin' },
      error: null,
    });

    const request = createRequest();
    const response = await DELETE(request) as any;
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('No tienes permisos para eliminar parqueaderos');
  });

  it('returns 400 if Supabase deletion fails', async () => {
    __deleteEqMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Failed to delete parking lot' },
    });

    const request = createRequest();
    const response = await DELETE(request) as any;
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Failed to delete parking lot');
  });

  it('returns 200 on successful deletion', async () => {
    const request = createRequest();
    const response = await DELETE(request) as any;
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe('Parqueadero eliminado exitosamente');
  });

  it('returns 500 on unexpected errors', async () => {
    const request = {
      // Missing url will throw an error when `new URL(req.url)` is called
      headers: new Headers({
        'Authorization': 'Bearer valid-token'
      })
    } as unknown as Request;

    // Silence console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await DELETE(request) as any;
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBeDefined();

    consoleError.mockRestore();
  });
});
